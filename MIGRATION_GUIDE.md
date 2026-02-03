# Class Name Normalization - Production Deployment Guide

## ⚠️ IMPORTANT: Read Before Running

This migration normalizes class names in your production database from full format to abbreviated format.

**Changes:**
- `Primary 1` → `P1`
- `Primary 2` → `P2`
- `Nursery 1` → `N1`
- etc.

---

## 📋 Pre-Flight Checklist

- [ ] ✅ You have access to production database
- [ ] ✅ You understand this will modify production data
- [ ] ✅ You're ready to run this on Koyeb

---

## 🚀 Deployment Steps

### Option A: Run via Koyeb Shell (Recommended)

1. **SSH into your Koyeb instance** (if available) or use Koyeb's run command feature

2. **Navigate to app directory:**
   ```bash
   cd /app  # or wherever your app is deployed
   ```

3. **Run the migration:**
   ```bash
   NODE_ENV=production tsx scripts/normalize-class-names.ts
   ```

4. **Monitor the output** - You'll see:
   - Current class formats
   - Number of records updated
   - Final verification
   - Any warnings about non-standard formats

### Option B: Run Locally Against Production Database

**⚠️ WARNING: This connects your local machine to production!**

1. **Get your production DATABASE_URL from Koyeb**
   - Go to Koyeb Dashboard → Your Service → Settings → Environment Variables
   - Copy the `DATABASE_URL` value

2. **Set the environment variable temporarily:**
   ```powershell
   # Windows PowerShell
   $env:DATABASE_URL="your-production-database-url-here"
   ```

3. **Run the migration:**
   ```powershell
   npm run tsx scripts/normalize-class-names.ts
   ```

4. **Verify in your app:**
   - Go to your deployed app
   - Navigate to Students Directory
   - Students should now appear correctly

### Option C: Add as One-Time Script on Koyeb

1. **Add to `package.json` scripts:**
   ```json
   {
     "scripts": {
       "migrate:classes": "tsx scripts/normalize-class-names.ts"
     }
   }
   ```

2. **Commit and push:**
   ```bash
   git add package.json scripts/normalize-class-names.ts
   git commit -m "Add class name normalization migration"
   git push origin main
   ```

3. **Run via Koyeb console:**
   ```bash
   npm run migrate:classes
   ```

---

## 📊 What the Script Does

1. **Shows current state** - Displays all unique class names in database
2. **Updates students table** - Normalizes `class_level` column
3. **Updates test_sessions** - Normalizes any test session class references
4. **Verifies results** - Shows final state and any issues
5. **Reports summary** - Total records updated

---

## ✅ Expected Output

```
🔄 Starting class name normalization migration...

📋 Step 1: Checking current class name formats...

📊 Current class formats in database:
┌─────────┬──────────────┬───────┐
│ (index) │ class_level  │ count │
├─────────┼──────────────┼───────┤
│    0    │ 'Primary 1'  │  45   │
│    1    │ 'Primary 2'  │  38   │
│    2    │ 'Nursery 1'  │  12   │
└─────────┴──────────────┴───────┘

🔧 Step 2: Normalizing students.class_level...
   ✅ Updated 45 students from %Primary 1% to P1
   ✅ Updated 38 students from %Primary 2% to P2
   ✅ Updated 12 students from %Nursery 1% to N1

📊 Total students updated: 95

🔧 Step 3: Normalizing test_sessions.class_level...
📊 Total test sessions updated: 0

🔍 Step 4: Verifying normalized class names...

✅ Final class formats in database:
┌─────────┬─────────────┬───────┐
│ (index) │ class_level │ count │
├─────────┼─────────────┼───────┤
│    0    │ 'P1'        │  45   │
│    1    │ 'P2'        │  38   │
│    2    │ 'N1'        │  12   │
└─────────┴─────────────┴───────┘

✅ All class names are now in standard format!

🎉 Migration completed successfully!
```

---

## 🔍 Troubleshooting

### Script fails with connection error
- **Verify DATABASE_URL** is correct
- **Check database is accessible** from where you're running

### Shows "non-standard class names"
The script will list any class names it couldn't automatically convert. You may need to:
- Manually update those records
- Or add additional patterns to the script

### No records updated
If output shows `Total students updated: 0`:
- Class names are already in correct format (P1, P2, etc.)
- Or there are no students in the database
- Run the debug query from previous guide to verify

---

## 🔄 What Happens After

1. **Students appear in directory** - Filter by class will now work
2. **All features work normally** - Marks, reports, etc. use correct class names
3. **No data loss** - Only the format changes, all student data preserved

---

## 🆘 Rollback (if needed)

If something goes wrong, you'd need to manually revert, but the original data format is:
```sql
-- Example manual rollback (if you know original format)
UPDATE students SET class_level = 'Primary 1' WHERE class_level = 'P1';
-- Repeat for each class
```

**Better approach:** Test on a database backup first if possible!

---

## 📞 Need Help?

If you encounter issues:
1. Copy the exact error message
2. Note which step failed
3. Share the console output

---

**Ready to run?** Follow Option A, B, or C above based on your access level to Koyeb.
