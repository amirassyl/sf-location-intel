# API Cache Strategy

## Cache Table Schema
- `address_hash`: unique identifier for the address query
- `data_type`: permits | complaints | businesses
- `cached_data`: JSONB column with API response
- `fetched_at`: timestamp for cache expiration
- `ttl`: 24 hours (can be adjusted)

## Cache Flow
1. Check if cached data exists and is fresh (< 24h old)
2. If yes, return cached data
3. If no, fetch from SF Open Data API
4. Store result in cache table
5. Return data

## Benefits
- Faster response times for repeated queries
- Reduced load on SF Open Data APIs
- Better user experience
