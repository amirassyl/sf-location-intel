/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import sgMail from '@sendgrid/mail';

// Set to true to print email content instead of sending it
const TEST_EMAIL_MODE = false;

// Maximum number of businesses to include in email
const MAX_BUSINESSES_IN_EMAIL = 50;

export default {
	// Handler for cron triggers - this runs automatically when the cron job fires
	async scheduled(event, env, ctx) {
		console.log(`[CRON TRIGGER] Scheduled event received at ${new Date().toISOString()}`);
		console.log(`[CRON TRIGGER] Cron: ${event.cron}, ScheduledTime: ${event.scheduledTime}`);
		
		try {
			const businesses = await getBusinessesLastWeek();
			const today = new Date();
			const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
			const emailBody = formatBusinessesEmail(businesses);
			const emailResult = await sendEmail(
				env,
				env.RECIPIENT_EMAIL,
				`Daily Businesses in SF - ${dayName}`,
				emailBody.text,
				emailBody.html
			);
			
			console.log(`Cron job executed successfully. ${emailResult}`);
		} catch (error) {
			console.error("Cron job error:", error);
			throw error; // Re-throw so Cloudflare knows the job failed
		}
	},
	
	// Optional: Keep fetch handler for dev testing only
	// In production, this won't be called by cron - only scheduled() will be
	async fetch(request, env, ctx) {
		// For dev testing - you can remove this if you don't want any HTTP endpoint
		return new Response(
			"This worker is configured for cron triggers only. Use 'wrangler dev --test-scheduled' to test the scheduled handler.",
			{ status: 200 }
		);
	},
};
  
  async function getBusinessesLastWeek() {
	const baseUrl = 'https://data.sf.gov/resource/g8m3-pdis.json';
	
	// Calculate date from 7 days ago
	const today = new Date();
	const lastWeek = new Date(today);
	lastWeek.setDate(today.getDate() - 1);
	
	// Format as YYYY-MM-DD
	const lastWeekStr = lastWeek.toISOString().split('T')[0];
	const todayStr = today.toISOString().split('T')[0];
	
	console.log(`Searching for businesses from ${lastWeekStr} to ${todayStr}`);
	
	// Build query parameters
	const params = new URLSearchParams({
	  '$where': `location_start_date >= '${lastWeekStr}' AND location_start_date <= '${todayStr}' AND city = 'San Francisco' AND full_business_address IS NOT NULL`,
	  '$order': 'location_start_date DESC',
	  '$limit': 500
	});
	
	try {
	  const response = await fetch(`${baseUrl}?${params}`);
	  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  
	  const businesses = await response.json();
	  
	  console.log(`✓ Found ${businesses.length} businesses from the last week\n`);
	  
	  // Display results
	  if (businesses.length > 0) {
		console.log('Recent businesses:');
		businesses.slice(0, 15).forEach((biz, i) => {
		  console.log(formatBusinessForConsole(biz, i + 1));
		});
	  } else {
		console.log('No businesses found in the last week');
	  }
	  
	  return businesses;
	  
	} catch (error) {
	  console.error('Error fetching data:', error);
	  return [];
	}
  }

  /**
   * Extracts business name from a business row
   * @param {Object} biz - Business row object
   * @returns {string} Business name
   */
  function getBusinessName(biz) {
	return biz.dba_name || biz.business_name || 'Unknown';
  }

  /**
   * Extracts business address from a business row
   * @param {Object} biz - Business row object
   * @returns {string} Business address
   */
  function getBusinessAddress(biz) {
	return biz.full_business_address || 'N/A';
  }

  /**
   * Generates a Google Maps search URL for an address
   * @param {string} address - Address to search for
   * @returns {string} Google Maps URL, or empty string if address is N/A
   */
  function getGoogleMapsUrl(address) {
	if (!address || address === 'N/A') {
	  return '';
	}
	// URL encode the address for the query parameter
	const encodedAddress = encodeURIComponent(address);
	return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }

  /**
   * Formats a single business row for email display
   * @param {Object} biz - Business row object
   * @param {boolean} is_html - Whether to format as HTML (default: true)
   * @returns {string} Formatted business string
   */
  function formatBusiness(biz, is_html = true) {
	const businessName = getBusinessName(biz);
	const address = getBusinessAddress(biz);
	const mapsUrl = getGoogleMapsUrl(address);
	
	if (is_html) {
	  if (mapsUrl) {
		return `<li><strong>${businessName}</strong> @ <a href="${mapsUrl}">${address}</a><br>`;
	  } else {
		return `<li><strong>${businessName}</strong> @ ${address}<br>`;
	  }
	} else {
	  if (mapsUrl) {
		return `${businessName} @ ${address} (${mapsUrl})`;
	  } else {
		return `${businessName} @ ${address}`;
	  }
	}
  }

  /**
   * Formats a business for console display
   * @param {Object} biz - Business row object
   * @param {number} index - Index number (1-based)
   * @returns {string} Formatted business string for console
   */
  function formatBusinessForConsole(biz, index) {
	const businessName = getBusinessName(biz);
	const dba = biz.dba_name || 'N/A';
	const address = getBusinessAddress(biz);
	const mapsUrl = getGoogleMapsUrl(address);
	const startDate = biz.location_start_date || 'N/A';
	const type = biz.naic_code_description || 'N/A';
	
	let result = `\n${index}. ${businessName}\n   DBA: ${dba}\n   Location: ${address}`;
	if (mapsUrl) {
	  result += `\n   Maps: ${mapsUrl}`;
	}
	result += `\n   Started: ${startDate}\n   Type: ${type}`;
	return result;
  }

  function formatBusinessesEmail(businesses) {
	if (businesses.length === 0) {
	  return {
		text: 'No new businesses found in San Francisco in the last week.',
		html: '<p>No new businesses found in San Francisco in the last week.</p>'
	  };
	}

	// Format text version
	let textBody = `Found ${businesses.length} new businesses in San Francisco from the last week:\n\n`;
	businesses.slice(0, MAX_BUSINESSES_IN_EMAIL).forEach((biz, i) => {
	  textBody += `${i + 1}. ${formatBusiness(biz, false)}\n`;
	});
	if (businesses.length > MAX_BUSINESSES_IN_EMAIL) {
	  textBody += `\n... and ${businesses.length - MAX_BUSINESSES_IN_EMAIL} more businesses.`;
	}

	// Format HTML version
	let htmlBody = `<h2>Found ${businesses.length} new businesses in San Francisco from the last week:</h2>\n<ul>`;
	businesses.slice(0, MAX_BUSINESSES_IN_EMAIL).forEach((biz, i) => {
	  htmlBody += formatBusiness(biz, true);
	});
	htmlBody += `</ul>`;
	if (businesses.length > MAX_BUSINESSES_IN_EMAIL) {
	  htmlBody += `<p><em>... and ${businesses.length - MAX_BUSINESSES_IN_EMAIL} more businesses.</em></p>`;
	}

	return { text: textBody, html: htmlBody };
  }
  
  async function sendEmail(env, recipient, subject, textBody, htmlBody) {
	// If TEST_EMAIL_MODE is enabled, print the email instead of sending it
	if (TEST_EMAIL_MODE) {
		console.log('\n========== EMAIL (TEST MODE - NOT SENT) ==========');
		console.log(`To: ${recipient}`);
		console.log(`From: ${env.SENDER_EMAIL}`);
		console.log(`Subject: ${subject}`);
		console.log('\n--- Text Version ---');
		console.log(textBody);
		console.log('\n--- HTML Version ---');
		console.log(htmlBody);
		console.log('==================================================\n');
		return "Email printed in test mode (not sent)";
	}

	const apiKey = env.SENDGRID_API_KEY;
	
	if (!apiKey) {
		console.log(`[MOCK] Sending email to: ${recipient}\nSubject: ${subject}\nBody: ${textBody}`);
		return "Mock Email sent! (No SENDGRID_API_KEY found)";
	}

	// Debug: Check if API key looks valid (starts with SG.)
	if (!apiKey.startsWith('SG.')) {
		console.warn(`[WARNING] API key doesn't look like a valid SendGrid key (should start with 'SG.')`);
		console.warn(`[WARNING] API key value: ${apiKey.substring(0, 10)}... (first 10 chars)`);
	}

	try {
		sgMail.setApiKey(apiKey);

		const msg = {
			to: recipient,
			from: env.SENDER_EMAIL, // Your verified sender
			subject: subject,
			text: textBody,
			html: htmlBody,
		};

		await sgMail.send(msg);
		console.log('Email sent successfully!');
		return "Email sent successfully!";
	} catch (error) {
		// Log detailed SendGrid error information
		console.error('SendGrid Error Details:');
		console.error('Code:', error.code);
		console.error('Message:', error.message);
		
		if (error.response) {
			console.error('Response Status:', error.response.statusCode || error.response.status);
			console.error('Response Body:', JSON.stringify(error.response.body, null, 2));
			
			if (error.response.body && error.response.body.errors) {
				console.error('SendGrid Errors:');
				error.response.body.errors.forEach((err, index) => {
					console.error(`  Error ${index + 1}:`, err.message || err);
					if (err.field) console.error(`    Field: ${err.field}`);
					if (err.help) console.error(`    Help: ${err.help}`);
				});
			}
		}
		
		throw error;
	}
  }