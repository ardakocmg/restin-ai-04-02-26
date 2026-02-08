"""
Print Bridge - TCP Socket Bridge for Network Printers (Rule #30)
Sends raw ESC/POS hex data to thermal printers over network.
"""
import socket
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/print", tags=["print-bridge"])


class RawPrintRequest(BaseModel):
    ip: str
    port: int = 9100
    data: str  # Hex-encoded ESC/POS data


class PrintResult(BaseModel):
    ok: bool
    message: str
    bytes_sent: int = 0


@router.post("/raw", response_model=PrintResult)
async def print_raw(request: RawPrintRequest):
    """
    Send raw hex data to network printer via TCP socket.
    
    This is the Edge Bridge pattern - browser calls this API,
    backend handles the actual network communication.
    """
    try:
        # Decode hex string to bytes
        raw_bytes = bytes.fromhex(request.data)
        
        # Create TCP socket and send
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # 5 second timeout
        
        logger.info(f"[PrintBridge] Connecting to {request.ip}:{request.port}...")
        sock.connect((request.ip, request.port))
        
        bytes_sent = sock.send(raw_bytes)
        sock.close()
        
        logger.info(f"[PrintBridge] Sent {bytes_sent} bytes to printer")
        return PrintResult(ok=True, message="Print job sent", bytes_sent=bytes_sent)
        
    except socket.timeout:
        logger.error(f"[PrintBridge] Timeout connecting to {request.ip}:{request.port}")
        raise HTTPException(status_code=504, detail="Printer connection timeout")
        
    except socket.error as e:
        logger.error(f"[PrintBridge] Socket error: {e}")
        raise HTTPException(status_code=502, detail=f"Printer connection failed: {str(e)}")
        
    except ValueError as e:
        logger.error(f"[PrintBridge] Invalid hex data: {e}")
        raise HTTPException(status_code=400, detail="Invalid hex data format")
        
    except Exception as e:
        logger.error(f"[PrintBridge] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-connection")
async def test_printer_connection(ip: str, port: int = 9100):
    """
    Test if a printer is reachable at the given IP:port.
    Does not send any print data.
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(3)
        sock.connect((ip, port))
        sock.close()
        return {"ok": True, "message": f"Printer at {ip}:{port} is reachable"}
    except socket.timeout:
        return {"ok": False, "message": "Connection timeout"}
    except socket.error as e:
        return {"ok": False, "message": f"Connection failed: {str(e)}"}
