"""
JWT Authentication Middleware for FastAPI
Validates JWT tokens from Node.js auth-service
"""
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from typing import Optional

# JWT secret should match your Node.js services
JWT_SECRET = os.getenv('JWT_SECRET', 'b8d2f8b9c24a17e1d1e1a2f6b5c3a8791e9b47a1e3c38a7216e7bbf7f28d194d')

security = HTTPBearer()

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials) -> dict:
    """
    Verify JWT token and return decoded payload
    """
    try:
        token = credentials.credentials
        
        # Decode and verify the token
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"]
        )
        
        return payload
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = security) -> dict:
    """
    Dependency to get current authenticated user
    """
    return await verify_jwt_token(credentials)

# Optional: Middleware to check auth on all routes
async def auth_middleware(request: Request, call_next):
    """
    Middleware to validate JWT on protected routes
    """
    # Skip auth for health check and root
    if request.url.path in ["/", "/health", "/docs", "/openapi.json"]:
        return await call_next(request)
    
    # Check for Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header"
        )
    
    # Extract and verify token
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # Add user info to request state
        request.state.user = payload
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
    return await call_next(request)
