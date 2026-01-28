$ErrorActionPreference = "Stop"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login
Write-Host "Attempting Login..."
$loginUrl = "http://localhost:5000/api/login"
$loginBody = @{ username = "admin_rec"; password = "Admin123!" } | ConvertTo-Json
$userStruct = $null

try {
    $loginRes = Invoke-WebRequest -Uri $loginUrl -Method Post -Body $loginBody -ContentType "application/json" -WebSession $session
    Write-Host "Login Successful"
    $userStruct = $loginRes.Content | ConvertFrom-Json
}
catch {
    Write-Error "Login Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
    exit 1
}

# 1.5 Switch School if needed
Write-Host "Checking Active School..."
$activeSchoolId = $null
# Check if property exists and is not null
if ($userStruct.PSObject.Properties.Match("activeSchoolId").Count -gt 0) {
    $activeSchoolId = $userStruct.activeSchoolId
}

if (-not $activeSchoolId) {
    Write-Host "No active school detected in login response."
    if ($userStruct.schools.Count -gt 0) {
        $schoolId = $userStruct.schools[0].id
        Write-Host "Switching to School ID: $schoolId"
        $switchUrl = "http://localhost:5000/api/switch-school"
        $switchBody = @{ schoolId = $schoolId } | ConvertTo-Json
        
        try {
            Invoke-WebRequest -Uri $switchUrl -Method Post -Body $switchBody -ContentType "application/json" -WebSession $session
            Write-Host "Switched School Successfully"
        }
        catch {
            Write-Error "Switch School Failed: $_"
            if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                Write-Host "Error Body: $($reader.ReadToEnd())"
            }
            exit 1
        }
    }
    else {
        Write-Error "User has no schools assigned!"
        exit 1
    }
}
else {
    Write-Host "Active School ID: $activeSchoolId"
}

# 2. List Students (Initial)
Write-Host "Listing Students..."
$listUrl = "http://localhost:5000/api/students"
try {
    $listRes = Invoke-WebRequest -Uri $listUrl -Method Get -WebSession $session
    $students = $listRes.Content | ConvertFrom-Json
    $count = $students.Count
    Write-Host "Initial Student Count: $count"
}
catch {
    Write-Error "List Students Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Body: $($reader.ReadToEnd())"
    }
    exit 1
}

# 3. Create Student
Write-Host "Creating Student..."
$createUrl = "http://localhost:5000/api/students"
$uniqueIdx = "IDX-" + (Get-Date).ToString("yyyyMMddHHmmss")
$newStudent = @{
    name           = "Test Student Verification"
    indexNumber    = $uniqueIdx
    classLevel     = "P1"
    stream         = "Red"
    gender         = "M"
    dateOfBirth    = "2015-01-01"
    boardingStatus = "day"
    parentName     = "Verify Parent"
    parentContact  = "0700000000"
} | ConvertTo-Json

try {
    $createRes = Invoke-WebRequest -Uri $createUrl -Method Post -Body $newStudent -ContentType "application/json" -WebSession $session
    $created = $createRes.Content | ConvertFrom-Json
    Write-Host "Created Student ID: $($created.id)"
}
catch {
    Write-Error "Create Failed: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
    exit 1
}

# 4. Update Student
Write-Host "Updating Student..."
$updateUrl = "http://localhost:5000/api/students/$($created.id)"
$updateBody = @{ name = "Test Student Updated" } | ConvertTo-Json
try {
    Invoke-WebRequest -Uri $updateUrl -Method Put -Body $updateBody -ContentType "application/json" -WebSession $session
    Write-Host "Student Updated Successfully"
}
catch {
    Write-Error "Update Failed: $_"
    exit 1
}

# 5. Delete Student (Soft Delete)
Write-Host "Deleting Student (Soft Delete)..."
$deleteUrl = "http://localhost:5000/api/students/$($created.id)"
try {
    Invoke-WebRequest -Uri $deleteUrl -Method Delete -WebSession $session
    Write-Host "Student Soft Deleted"
}
catch {
    Write-Error "Delete Failed: $_"
    exit 1
}

# 6. Verify Deletion
Write-Host "Verifying Deletion..."
$listRes2 = Invoke-WebRequest -Uri $listUrl -Method Get -WebSession $session
$students2 = $listRes2.Content | ConvertFrom-Json
$found = $false
foreach ($s in $students2) {
    if ($s.id -eq $created.id) {
        $found = $true
        break
    }
}

if ($found) {
    Write-Error "Student still present in list! Soft delete failed."
    exit 1
}
else {
    Write-Host "Verification Success: Student not in list."
}
