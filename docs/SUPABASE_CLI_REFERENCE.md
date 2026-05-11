# Supabase CLI Quick Reference
## Rev Cloud Blueprint - Database Management

**Project:** `revcloud-blueprint-web`  
**Project Ref:** `apunqskpnzdqbispulrh`  
**Region:** West EU (London)  
**Created:** September 20, 2025

---

## 📋 Status: ✅ Connected

Your project is now linked to Supabase CLI!

```
✓ Logged in to Supabase
✓ Project linked: revcloud-blueprint-web
✓ Can run remote commands
```

---

## 🚀 Essential Commands

### 1. Inspect Database Tables

**View all tables with sizes and row counts:**
```bash
supabase inspect db table-stats --linked
```

**Output:**
```
Name                      | Table size | Index size | Total size | Estimated rows
--------------------------|------------|------------|------------|---------------
device_authorizations     | 16 kB      | 96 kB      | 112 kB     | 8
devices                   | 16 kB      | 80 kB      | 96 kB      | 18
consent_logs              | 16 kB      | 72 kB      | 88 kB      | 9
...
```

---

### 2. View Database Roles

**See all database roles and their stats:**
```bash
supabase inspect db role-stats --linked
```

---

### 3. Check Indexes

**View index usage and performance:**
```bash
supabase inspect db index-stats --linked
```

This shows:
- Index sizes
- Usage percentage
- Scan counts
- Unused indexes (candidates for removal)

---

### 4. Find Long-Running Queries

**Monitor active queries:**
```bash
supabase inspect db long-running-queries --linked
```

**See all currently locked tables:**
```bash
supabase inspect db locks --linked
```

---

### 5. Database Health Checks

**Overall database statistics:**
```bash
supabase inspect db db-stats --linked
```

Shows:
- Cache hit rate
- Total database size
- WAL (Write-Ahead Log) size
- Buffer usage

**Vacuum statistics (table bloat):**
```bash
supabase inspect db vacuum-stats --linked
```

---

### 6. Query Performance Analysis

**Top slowest queries:**
```bash
supabase inspect db outliers --linked
```

**Most frequently called queries:**
```bash
supabase inspect db calls --linked
```

---

### 7. Replication Status

**Check replication slots (for backups):**
```bash
supabase inspect db replication-slots --linked
```

---

## 🗄️ Schema Management

### Export Current Schema (Requires Docker)

```bash
# Pull entire schema to local migrations folder
supabase db pull --schema public

# Pull specific schemas
supabase db pull --schema public,auth
```

**Note:** This requires Docker Desktop to be running.

---

### Compare Local vs Remote

```bash
# Show differences between local migrations and remote DB
supabase db diff --linked --schema public
```

---

## 📊 Project Management

### List All Projects

```bash
supabase projects list
```

### Show Project Details

```bash
supabase projects api-keys
```

This shows:
- Project reference ID
- API URL
- Anon key
- Service role key (masked)

---

### Link/Unlink Projects

```bash
# Link to different project
supabase link --project-ref <project-ref>

# Unlink current project
supabase unlink
```

---

## 🔐 Authentication Management

### List Auth Users

Via Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/apunqskpnzdqbispulrh
2. Navigate to **Authentication** → **Users**

Or use the Management API (requires API key).

---

## 📝 Running SQL Queries

### Option 1: Via Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/apunqskpnzdqbispulrh
2. Navigate to **SQL Editor**
3. Create new query
4. Run your SQL

### Option 2: Via CLI (Requires psql)
```bash
# Install psql first (PostgreSQL client)
brew install postgresql

# Get connection string from dashboard, then:
psql "postgresql://postgres:[YOUR-PASSWORD]@db.apunqskpnzdqbispulrh.supabase.co:5432/postgres"
```

---

## 🔍 Useful SQL Queries

### List All Tables
```sql
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)::regclass) DESC;
```

### View All Constraints
```sql
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;
```

### Check RLS Policies
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### View All Triggers
```sql
SELECT
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### Get Database Size
```sql
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;
```

### Active Connections
```sql
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query
FROM pg_stat_activity
WHERE datname = current_database()
    AND state = 'active'
ORDER BY query_start DESC;
```

---

## 🛠️ Maintenance Commands

### Update Supabase CLI

```bash
# Homebrew (macOS)
brew upgrade supabase

# Or use npm
npm update -g supabase
```

**Current Version:** 2.48.3  
**Latest Version:** 2.51.0 ⚠️ Update recommended!

---

### Logout

```bash
supabase logout
```

---

## 📚 Documentation Files

Your project now has these documentation files:

1. **`COMPLETE_DATABASE_SCHEMA_REPORT.md`** ⭐ **NEW**
   - Comprehensive schema documentation
   - All tables, columns, constraints
   - Relationships and cascade behavior
   - Security policies (RLS)
   - Triggers and functions
   - Current statistics

2. **`supabase/migrations/MISSING_CORE_TABLES.sql`** ⭐ **NEW**
   - DDL for core tables (teams, licenses, devices)
   - Helper functions
   - RLS policies
   - Reference only (tables already exist)

3. **`docs/DATABASE_SCHEMA.md`**
   - Original design documentation
   - Entity relationship diagrams
   - Business logic overview

4. **`docs/DATABASE_SETUP_COMPLETE.md`**
   - Migration setup instructions
   - Verification checklist
   - Troubleshooting guide

5. **`supabase/migrations/setup_cascade_delete.sql`**
   - Cascade delete configuration
   - User deletion functions

6. **`apps/web/supabase/migrations/`**
   - Admin console schema
   - Feature management
   - Usage tracking
   - Consent logs

---

## 🔥 Quick Diagnostic Commands

Run these to check database health:

```bash
# 1. Table sizes (identify large tables)
supabase inspect db table-stats --linked

# 2. Cache hit rate (should be > 95%)
supabase inspect db db-stats --linked

# 3. Unused indexes (consider removing)
supabase inspect db index-stats --linked

# 4. Slow queries (optimize these)
supabase inspect db outliers --linked

# 5. Table bloat (may need VACUUM)
supabase inspect db vacuum-stats --linked
```

---

## 📊 Export Options

### Export as JSON
```bash
supabase inspect db table-stats --linked -o json > db-stats.json
```

### Export as CSV (via jq)
```bash
supabase inspect db table-stats --linked -o json | jq -r '(.[0] | keys_unsorted) as $keys | $keys, (.[] | [.[ $keys[] ]]) | @csv' > db-stats.csv
```

---

## 🚨 Important Notes

1. **Docker Requirement:** Some commands (`db pull`, `db diff`) require Docker Desktop
2. **Service Role Key:** Never commit or expose your service role key
3. **RLS Testing:** Always test RLS policies before deploying to production
4. **Backups:** Supabase automatically backs up your database (check dashboard)
5. **Migration Naming:** Use format `YYYYMMDDHHMMSS_description.sql` for migrations

---

## 🔗 Useful Links

- **Dashboard:** https://supabase.com/dashboard/project/apunqskpnzdqbispulrh
- **SQL Editor:** https://supabase.com/dashboard/project/apunqskpnzdqbispulrh/sql/new
- **API Docs:** https://supabase.com/dashboard/project/apunqskpnzdqbispulrh/api
- **Auth Users:** https://supabase.com/dashboard/project/apunqskpnzdqbispulrh/auth/users
- **Database:** https://supabase.com/dashboard/project/apunqskpnzdqbispulrh/database/tables
- **CLI Docs:** https://supabase.com/docs/guides/cli

---

## 💡 Pro Tips

1. **Output to file:** Add `> output.txt` to any command to save results
2. **JSON output:** Add `-o json` for programmatic parsing
3. **Filter results:** Use `grep`, `awk`, or `jq` to filter output
4. **Watch mode:** Combine with `watch` command: `watch -n 5 "supabase inspect db locks --linked"`
5. **Alias commands:** Add to `.zshrc`:
   ```bash
   alias supa-stats="supabase inspect db table-stats --linked"
   alias supa-health="supabase inspect db db-stats --linked"
   ```

---

**Happy querying!** 🚀

For questions or issues, check the comprehensive schema report:
👉 `COMPLETE_DATABASE_SCHEMA_REPORT.md`


