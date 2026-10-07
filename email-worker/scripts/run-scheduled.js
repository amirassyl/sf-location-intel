#!/usr/bin/env node

/**
 * Local script to run the scheduled handler directly
 * This allows you to test the scheduled function locally without wrangler
 * 
 * Usage: node scripts/run-scheduled.js
 * Or: npm run local:scheduled
 */

import worker from '../src/index.js';

// Create a mock scheduled event (what Cloudflare Workers provides)
const scheduledEvent = {
	cron: '0 15 * * *',
	scheduledTime: Date.now(),
};

// Read environment variables (for local testing)
// SENDGRID_API_KEY can be set via:
// 1. Environment variable: export SENDGRID_API_KEY=your_key_here
// 2. .env file (if using dotenv)
// 3. Command line: SENDGRID_API_KEY=your_key npm run local:scheduled
const env = {
	SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
	SENDER_EMAIL: process.env.SENDER_EMAIL,
	RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL,
};

// Mock execution context
const ctx = {
	waitUntil: (promise) => {
		// In local testing, we'll just await the promise
		return promise;
	},
	passThroughOnException: () => {},
};

async function runScheduled() {
	console.log('🚀 Running scheduled handler locally...\n');
	
	try {
		await worker.scheduled(scheduledEvent, env, ctx);
		console.log('\n✅ Scheduled handler completed successfully!');
		process.exit(0);
	} catch (error) {
		console.error('\n❌ Scheduled handler failed:', error);
		process.exit(1);
	}
}

runScheduled();

