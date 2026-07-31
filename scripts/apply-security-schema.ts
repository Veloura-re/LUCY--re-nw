import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DIRECT_URL || process.env.DATABASE_URL
        }
    }
});

async function main() {
    console.log("Applying Security Database Schema...");

    // 1. Rate Limit Table
    await prisma.$executeRawUnsafe(`
        CREATE UNLOGGED TABLE IF NOT EXISTS auth_rate_limits (
            ip_address INET PRIMARY KEY,
            attempts INT DEFAULT 1,
            last_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            locked_until TIMESTAMP WITH TIME ZONE
        );
    `);
    console.log("- Created auth_rate_limits table");

    // 2. Audit Logs Table
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS auth_audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ip_address INET,
            email VARCHAR(255),
            status VARCHAR(50),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log("- Created auth_audit_logs table");

    // 3. Plpgsql Function
    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION enforce_login_rate_limit(client_ip INET) 
        RETURNS BOOLEAN AS $$
        DECLARE
            limit_record auth_rate_limits%ROWTYPE;
            MAX_ATTEMPTS CONSTANT INT := 5;
            LOCKOUT_DURATION CONSTANT INTERVAL := '15 minutes';
        BEGIN
            SELECT * INTO limit_record FROM auth_rate_limits WHERE ip_address = client_ip;
            
            IF FOUND THEN
                -- Check if currently locked out
                IF limit_record.locked_until > CURRENT_TIMESTAMP THEN
                    RETURN FALSE; -- Access Denied
                END IF;

                -- If the last attempt was over an hour ago, reset counter
                IF limit_record.last_attempt < (CURRENT_TIMESTAMP - INTERVAL '1 hour') THEN
                    UPDATE auth_rate_limits SET attempts = 1, last_attempt = CURRENT_TIMESTAMP, locked_until = NULL WHERE ip_address = client_ip;
                    RETURN TRUE;
                END IF;

                -- Increment attempts
                IF limit_record.attempts >= MAX_ATTEMPTS THEN
                    UPDATE auth_rate_limits SET locked_until = CURRENT_TIMESTAMP + LOCKOUT_DURATION, last_attempt = CURRENT_TIMESTAMP WHERE ip_address = client_ip;
                    RETURN FALSE; -- Access Denied
                ELSE
                    UPDATE auth_rate_limits SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP WHERE ip_address = client_ip;
                    RETURN TRUE;
                END IF;
            ELSE
                INSERT INTO auth_rate_limits (ip_address) VALUES (client_ip);
                RETURN TRUE;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
    `);
    console.log("- Created enforce_login_rate_limit function");

    console.log("Done.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
