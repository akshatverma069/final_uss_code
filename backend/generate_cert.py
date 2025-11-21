#!/usr/bin/env python3
"""
SSL Certificate Generator
Security: Generate self-signed SSL certificates for HTTPS development
"""
import os
import subprocess
import sys
from pathlib import Path

def generate_self_signed_cert():
    """
    Generate a self-signed SSL certificate for development
    Security: For production, use certificates from a trusted CA (Let's Encrypt, etc.)
    """
    # Create certs directory
    certs_dir = Path("certs")
    certs_dir.mkdir(exist_ok=True)
    
    cert_file = certs_dir / "server.crt"
    key_file = certs_dir / "server.key"
    
    # Check if certificates already exist
    if cert_file.exists() and key_file.exists():
        print("⚠️  SSL certificates already exist!")
        response = input("Do you want to regenerate them? (y/N): ")
        if response.lower() != 'y':
            print("✅ Keeping existing certificates")
            return
        else:
            cert_file.unlink()
            key_file.unlink()
    
    print("🔒 Generating self-signed SSL certificate...")
    print("   This is for DEVELOPMENT only!")
    print("   For PRODUCTION, use certificates from a trusted CA (Let's Encrypt, etc.)")
    print()
    
    # Generate certificate using OpenSSL
    try:
        # Generate private key
        subprocess.run([
            "openssl", "genrsa",
            "-out", str(key_file),
            "2048"
        ], check=True, capture_output=True)
        
        # Generate certificate signing request
        csr_file = certs_dir / "server.csr"
        subprocess.run([
            "openssl", "req", "-new",
            "-key", str(key_file),
            "-out", str(csr_file),
            "-subj", "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        ], check=True, capture_output=True)
        
        # Generate self-signed certificate (valid for 365 days)
        subprocess.run([
            "openssl", "x509", "-req",
            "-days", "365",
            "-in", str(csr_file),
            "-signkey", str(key_file),
            "-out", str(cert_file),
            "-extensions", "v3_req",
            "-extfile", "-"
        ], input=b"""[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
""", check=True, capture_output=True)
        
        # Remove CSR file (not needed)
        csr_file.unlink()
        
        # Set restrictive permissions
        os.chmod(key_file, 0o600)  # Read/write for owner only
        os.chmod(cert_file, 0o644)  # Read for all, write for owner
        
        print("✅ SSL certificate generated successfully!")
        print(f"   Certificate: {cert_file}")
        print(f"   Private Key: {key_file}")
        print()
        print("⚠️  IMPORTANT:")
        print("   - This is a self-signed certificate for development")
        print("   - Browsers will show a security warning (this is normal)")
        print("   - For production, use certificates from Let's Encrypt or a trusted CA")
        print()
        print("🔒 You can now start the server with HTTPS enabled!")
        
    except subprocess.CalledProcessError as e:
        print("❌ Error generating certificate:")
        print(f"   {e.stderr.decode() if e.stderr else str(e)}")
        print()
        print("💡 Make sure OpenSSL is installed:")
        print("   - Windows: Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html")
        print("   - macOS: brew install openssl")
        print("   - Linux: sudo apt-get install openssl (or equivalent)")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ OpenSSL not found!")
        print()
        print("💡 Please install OpenSSL:")
        print("   - Windows: https://slproweb.com/products/Win32OpenSSL.html")
        print("   - macOS: brew install openssl")
        print("   - Linux: sudo apt-get install openssl (or equivalent)")
        sys.exit(1)

if __name__ == "__main__":
    generate_self_signed_cert()

