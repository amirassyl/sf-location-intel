import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index.js';

describe('SF business email worker', () => {
	describe('scheduled handler (cron trigger)', () => {
		it('runs scheduled handler and sends email', async () => {
			const ctx = createExecutionContext();
			const scheduledEvent = {
				cron: '0 15 * * *',
				scheduledTime: Date.now(),
			};

			// Spy on console.log to verify the email was sent
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			// Execute the scheduled handler
			await worker.scheduled(scheduledEvent, env, ctx);
			
			// Wait for all promises to settle
			await waitOnExecutionContext(ctx);

			// Verify that console.log was called (indicating email was sent)
			expect(consoleSpy).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Cron job executed successfully')
			);

			// Verify email sending was logged (mock mode when no API key)
			const emailLogCall = consoleSpy.mock.calls.find(call => 
				call[0]?.includes('[MOCK]') || call[0]?.includes('Sending email to')
			);
			expect(emailLogCall).toBeDefined();
			expect(emailLogCall[0]).toContain('Daily Businesses in SF');

			consoleSpy.mockRestore();
		});

		it('runs without errors', async () => {
			const ctx = createExecutionContext();
			const scheduledEvent = {
				cron: '0 15 * * *',
				scheduledTime: Date.now(),
			};

			// Should not throw
			await expect(
				worker.scheduled(scheduledEvent, env, ctx)
			).resolves.not.toThrow();

			await waitOnExecutionContext(ctx);
		});
	});

	describe('fetch handler', () => {
		it('returns message about cron-only configuration', async () => {
			const request = new Request('http://example.com');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			
			const text = await response.text();
			expect(text).toContain('cron triggers only');
			expect(response.status).toBe(200);
		});
	});
});
