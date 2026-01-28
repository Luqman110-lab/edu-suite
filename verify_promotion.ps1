
$baseUrl = "http://localhost:5000"
$adminUser = "admin_rec"
$adminPass = "Admin123!"
$cookieJar = New-Object System.Net.CookieContainer
$session = $null

function Login {
    Write-Host "Logging in..."
    $loginUrl = "$baseUrl/api/login"
    $body = @{ username = $adminUser; password = $adminPass } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $body -ContentType "application/json" -SessionVariable session -WebSession $session
        Write-Host "Login successful."
        $global:session = $session
        
        # Check if we have an active school
        if (-not $loginResponse.activeSchoolId) {
            Write-Host "Warning: No active school detected. Attempting to switch..."
            $schools = $loginResponse.schools
            if ($schools.Count -gt 0) {
                $schoolId = $schools[0].id
                Switch-School $schoolId
            }
            else {
                Write-Error "User has no schools assigned!"
                exit 1
            }
        }
        else {
            Write-Host "Active School ID: $($loginResponse.activeSchoolId)"
        }
    }
    catch {
        Write-Error "Login failed: $_"
        exit 1
    }
}

function Switch-School($schoolId) {
    Write-Host "Switching to School ID: $schoolId..."
    $url = "$baseUrl/api/switch-school"
    $body = @{ schoolId = $schoolId } | ConvertTo-Json
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -WebSession $global:session
        Write-Host "Switched school successfully. Active School ID: $($response.activeSchoolId)"
    }
    catch {
        Write-Error "Failed to switch school: $_"
        exit 1
    }
}

function Create-Student($name, $classLevel) {
    $url = "$baseUrl/api/students"
    $studentData = @{
        name           = $name
        classLevel     = $classLevel
        stream         = "Red"
        gender         = "M"
        indexNumber    = "TEST-PROMOTE-$(Get-Random)"
        dateOfBirth    = "2015-01-01"
        nationality    = "Ugandan"
        boardingStatus = "day"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $studentData -ContentType "application/json" -WebSession $global:session
        Write-Host "Created student: $($response.name) (ID: $($response.id)) in Class: $($response.classLevel)"
        return $response
    }
    catch {
        Write-Error "Failed to create student: $_"
        return $null
    }
}

function Promote-Students($studentIds) {
    $url = "$baseUrl/api/students/promote"
    $body = @{
        studentIds = $studentIds
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json" -WebSession $global:session
        Write-Host "Promotion Result: Promoted: $($response.promotedCount), Graduated: $($response.graduatedCount), Skipped: $($response.skippedCount)"
        return $response
    }
    catch {
        Write-Error "Failed to promote students: $_"
        exit 1
    }
}

function Get-Student($id) {
    # We can't get a single student by ID easily if the listing endpoint doesn't support filter by ID, 
    # but we can list all and find, or just trust the promote response if we want to be lazy, 
    # but verified is better. Let's list all and filter.
    $url = "$baseUrl/api/students"
    try {
        $students = Invoke-RestMethod -Uri $url -Method Get -WebSession $global:session
        $student = $students | Where-Object { $_.id -eq $id }
        return $student
    }
    catch {
        Write-Error "Failed to get students: $_"
        return $null
    }
}

function Delete-Student($id) {
    $url = "$baseUrl/api/students/$id"
    try {
        Invoke-RestMethod -Uri $url -Method Delete -WebSession $global:session
        Write-Host "Deleted student ID: $id"
    }
    catch {
        Write-Error "Failed to delete student: $_"
    }
}

# Main Execution Flow
Login

# 1. Test P1 -> P2
Write-Host "`n--- Testing P1 -> P2 Promotion ---"
$studentP1 = Create-Student "Promote Test P1" "P1"
if ($studentP1) {
    Promote-Students @($studentP1.id)
    $updatedStudent = Get-Student $studentP1.id
    if ($updatedStudent.classLevel -eq "P2") {
        Write-Host "SUCCESS: Student promoted to P2" -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Student is still $($updatedStudent.classLevel)"
    }
}

# 2. Test P7 -> Alumni (Graduation)
Write-Host "`n--- Testing P7 -> Alumni Promotion ---"
$studentP7 = Create-Student "Promote Test P7" "P7"
if ($studentP7) {
    Promote-Students @($studentP7.id)
    $updatedStudent = Get-Student $studentP7.id
    if ($updatedStudent.classLevel -eq "Alumni") {
        Write-Host "SUCCESS: Student promoted to Alumni (Graduated)" -ForegroundColor Green
    }
    else {
        Write-Error "FAILURE: Student is still $($updatedStudent.classLevel)"
    }
}

# Cleanup
Write-Host "`n--- Cleanup ---"
if ($studentP1) { Delete-Student $studentP1.id }
if ($studentP7) { Delete-Student $studentP7.id }

Write-Host "Done."
