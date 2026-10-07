from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SF OpenData API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SF OpenData API endpoints (Socrata SODA API)
PERMITS_API = "https://data.sf.gov/resource/i98e-djp9.json"
CRIME_API = "https://data.sf.gov/resource/wg3w-h783.json"
BUSINESS_API = "https://data.sf.gov/resource/g8m3-pdis.json"

# Anomaly detection thresholds
ANOMALY_THRESHOLDS = {
    "permits_high": 20,
    "crime_high": 15,
    "business_high": 50
}


class SearchResponse(BaseModel):
    address: str
    normalized_address: str
    permits: List[Dict[str, Any]]
    crimes: List[Dict[str, Any]]
    businesses: List[Dict[str, Any]]
    summary: Dict[str, Any]
    anomalies: List[str]


def normalize_address(address: str) -> str:
    """Normalize address for consistent querying."""
    # Convert to uppercase
    addr = address.upper().strip()
    
    # Expand common abbreviations
    addr = re.sub(r'\bST\b', 'STREET', addr)
    addr = re.sub(r'\bAVE\b', 'AVENUE', addr)
    addr = re.sub(r'\bBLVD\b', 'BOULEVARD', addr)
    addr = re.sub(r'\bDR\b', 'DRIVE', addr)
    addr = re.sub(r'\bRD\b', 'ROAD', addr)
    addr = re.sub(r'\bLN\b', 'LANE', addr)
    addr = re.sub(r'\bCT\b', 'COURT', addr)
    addr = re.sub(r'\bPL\b', 'PLACE', addr)
    
    # Remove extra spaces
    addr = re.sub(r'\s+', ' ', addr)
    
    return addr


def extract_street_name(address: str) -> str:
    """Extract street name from address (remove numbers, units, etc.)."""
    # Remove leading numbers
    addr = re.sub(r'^\d+\s*', '', address)
    # Remove unit numbers
    addr = re.sub(r'(APT|UNIT|STE|#)\s*[A-Z0-9]+', '', addr, flags=re.IGNORECASE)
    # Remove the street suffix: the datasets store it separately or abbreviated,
    # so "MARKET STREET" matches nothing while "MARKET" does
    addr = re.sub(r'\b(STREET|AVENUE|BOULEVARD|DRIVE|ROAD|LANE|COURT|PLACE)\b', '', addr)
    addr = re.sub(r'\s+', ' ', addr).strip()
    return addr


async def query_sf_api(url: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Query SF OpenData API with error handling and retry logic.
    
    Args:
        url: API endpoint URL
        params: Query parameters
    
    Returns:
        List of results or empty list on error
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            logger.info(f"Querying {url} with params: {params}")
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Received {len(data)} results from {url}")
            return data
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error querying {url}: {e.response.status_code} - {e.response.text}")
        return []
    except httpx.RequestError as e:
        logger.error(f"Request error querying {url}: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error querying {url}: {str(e)}")
        return []


def detect_anomalies(permits_count: int, crimes_count: int, business_count: int) -> List[str]:
    """Detect anomalies based on count thresholds."""
    anomalies = []
    
    if permits_count > ANOMALY_THRESHOLDS["permits_high"]:
        anomalies.append(f"High permit activity: {permits_count} permits (threshold: {ANOMALY_THRESHOLDS['permits_high']})")
    
    if crimes_count > ANOMALY_THRESHOLDS["crime_high"]:
        anomalies.append(f"High crime reports: {crimes_count} incidents (threshold: {ANOMALY_THRESHOLDS['crime_high']})")
    
    if business_count > ANOMALY_THRESHOLDS["business_high"]:
        anomalies.append(f"High business density: {business_count} businesses (threshold: {ANOMALY_THRESHOLDS['business_high']})")
    
    return anomalies


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "SF OpenData API",
        "version": "1.0.0",
        "endpoints": {
            "/search": "Search by address for permits, crimes, and businesses",
            "/health": "Health check endpoint",
            "/thresholds": "View anomaly detection thresholds"
        },
        "data_sources": {
            "permits": "Building Permits (i98e-djp9)",
            "crimes": "Police Incident Reports 2018-Present (wg3w-h783)",
            "businesses": "Registered Business Locations (g8m3-pdis)"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/search", response_model=SearchResponse)
async def search_address(
    address: str = Query(..., description="Address to search for", min_length=3)
):
    """
    Search SF OpenData for permits, crimes, and businesses at a given address.
    
    Args:
        address: Street address to search (e.g., "1600 Market Street")
    
    Returns:
        Unified results with permits, crimes, businesses, summary, and anomalies
    """
    # Normalize the address
    normalized = normalize_address(address)
    street_name = extract_street_name(normalized)
    
    logger.info(f"Searching for address: {address} (normalized: {normalized}, street: {street_name})")
    
    # Build queries for all three APIs
    # Permits API - search by street_name field
    permits_params = {
        "$where": f"upper(street_name) LIKE '%{street_name}%'",
        "$limit": 1000
    }
    
    # Crime API - search by intersection field (contains street names)
    # Note: Crime data uses 'intersection' field which has format "STREET1 \\ STREET2"
    crimes_params = {
        "$where": f"upper(intersection) LIKE '%{street_name}%'",
        "$limit": 1000,
        "$order": "incident_datetime DESC"
    }
    
    # Business API - search by street_address field
    # Also filter for active businesses (no end date)
    business_params = {
        "$where": f"upper(full_business_address) LIKE '%{street_name}%' AND location_end_date IS NULL",
        "$limit": 1000
    }
    
    # Execute queries in parallel
    try:
        permits_data = await query_sf_api(PERMITS_API, permits_params)
        crimes_data = await query_sf_api(CRIME_API, crimes_params)
        business_data = await query_sf_api(BUSINESS_API, business_params)
    except Exception as e:
        logger.error(f"Error during API queries: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error querying SF OpenData APIs: {str(e)}")
    
    # Calculate summary statistics
    summary = {
        "total_permits": len(permits_data),
        "total_crimes": len(crimes_data),
        "total_businesses": len(business_data),
        "permit_types": {},
        "crime_categories": {},
        "business_types": {}
    }
    
    # Aggregate permit types
    for permit in permits_data:
        permit_type = permit.get("permit_type_definition", "Unknown")
        summary["permit_types"][permit_type] = summary["permit_types"].get(permit_type, 0) + 1
    
    # Aggregate crime categories
    for crime in crimes_data:
        category = crime.get("incident_category", "Unknown")
        summary["crime_categories"][category] = summary["crime_categories"].get(category, 0) + 1
    
    # Aggregate business types (NAICS codes)
    for business in business_data:
        biz_type = business.get("naics_code_description", 
                                business.get("lic_code_description", "Unknown"))
        summary["business_types"][biz_type] = summary["business_types"].get(biz_type, 0) + 1
    
    # Detect anomalies
    anomalies = detect_anomalies(
        len(permits_data),
        len(crimes_data),
        len(business_data)
    )
    
    return SearchResponse(
        address=address,
        normalized_address=normalized,
        permits=permits_data,
        crimes=crimes_data,
        businesses=business_data,
        summary=summary,
        anomalies=anomalies
    )


@app.get("/thresholds")
async def get_thresholds():
    """Get current anomaly detection thresholds."""
    return {
        "thresholds": ANOMALY_THRESHOLDS,
        "description": {
            "permits_high": "Number of permits that triggers high activity alert",
            "crime_high": "Number of crimes that triggers high crime alert",
            "business_high": "Number of businesses that triggers high density alert"
        }
    }


@app.get("/test")
async def test_endpoints():
    """Test endpoint to verify SF OpenData API connectivity."""
    results = {}
    
    # Test permits API
    try:
        permits_test = await query_sf_api(PERMITS_API, {"$limit": 1})
        results["permits"] = {
            "status": "success" if permits_test else "no_data",
            "count": len(permits_test),
            "sample": permits_test[0] if permits_test else None
        }
    except Exception as e:
        results["permits"] = {"status": "error", "error": str(e)}
    
    # Test crime API
    try:
        crime_test = await query_sf_api(CRIME_API, {"$limit": 1})
        results["crimes"] = {
            "status": "success" if crime_test else "no_data",
            "count": len(crime_test),
            "sample": crime_test[0] if crime_test else None
        }
    except Exception as e:
        results["crimes"] = {"status": "error", "error": str(e)}
    
    # Test business API
    try:
        business_test = await query_sf_api(BUSINESS_API, {"$limit": 1})
        results["businesses"] = {
            "status": "success" if business_test else "no_data",
            "count": len(business_test),
            "sample": business_test[0] if business_test else None
        }
    except Exception as e:
        results["businesses"] = {"status": "error", "error": str(e)}
    
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)