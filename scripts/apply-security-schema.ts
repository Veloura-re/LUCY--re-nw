import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
import { prisma } from '../lib/prisma';

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

    // 3. Plpgsql Functions
    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION enforce_login_rate_limit(client_ip INET) 
        RETURNS BOOLEAN AS $$
        DECLARE
            limit_record auth_rate_limits%ROWTYPE;
            MAX_ATTEMPTS CONSTANT INT := 50;
            WINDOW_DURATION CONSTANT INTERVAL := '1 hour';
            LOCKOUT_DURATION CONSTANT INTERVAL := '1 hour';
        BEGIN
            -- Never rate limit localhost/loopback
            IF client_ip = '127.0.0.1'::inet OR client_ip = '::1'::inet THEN
                RETURN TRUE;
            END IF;

            SELECT * INTO limit_record FROM auth_rate_limits WHERE ip_address = client_ip;
            
            IF FOUND THEN
                -- Check if currently locked out
                IF limit_record.locked_until IS NOT NULL AND limit_record.locked_until > CURRENT_TIMESTAMP THEN
                    RETURN FALSE; -- Access Denied
                END IF;

                -- If the last attempt was over 1 hour ago, or lockout expired, reset counter
                IF limit_record.last_attempt < (CURRENT_TIMESTAMP - WINDOW_DURATION) OR (limit_record.locked_until IS NOT NULL AND limit_record.locked_until <= CURRENT_TIMESTAMP) THEN
                    UPDATE auth_rate_limits SET attempts = 1, last_attempt = CURRENT_TIMESTAMP, locked_until = NULL WHERE ip_address = client_ip;
                    RETURN TRUE;
                END IF;

                -- Check if attempts exceed maximum allowed (50)
                IF limit_record.attempts >= MAX_ATTEMPTS THEN
                    UPDATE auth_rate_limits SET locked_until = CURRENT_TIMESTAMP + LOCKOUT_DURATION, last_attempt = CURRENT_TIMESTAMP WHERE ip_address = client_ip;
                    RETURN FALSE; -- Access Denied
                ELSE
                    UPDATE auth_rate_limits SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP WHERE ip_address = client_ip;
                    RETURN TRUE;
                END IF;
            ELSE
                INSERT INTO auth_rate_limits (ip_address, attempts, last_attempt, locked_until) 
                VALUES (client_ip, 1, CURRENT_TIMESTAMP, NULL)
                ON CONFLICT (ip_address) DO UPDATE 
                SET attempts = auth_rate_limits.attempts + 1, last_attempt = CURRENT_TIMESTAMP;
                RETURN TRUE;
            END IF;
        END;
        $$ LANGUAGE plpgsql;
    `);
    console.log("- Created enforce_login_rate_limit function (50 attempts / 1 hour)");

    await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION reset_login_rate_limit(client_ip INET)
        RETURNS VOID AS $$
        BEGIN
            DELETE FROM auth_rate_limits WHERE ip_address = client_ip;
        END;
        $$ LANGUAGE plpgsql;
    `);
    console.log("- Created reset_login_rate_limit function");

    // Clear any existing stale lockouts
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE auth_rate_limits;`);
    console.log("- Cleared existing rate limit blocks");

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
