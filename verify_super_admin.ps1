
$baseUrl = "http://localhost:5000"
$adminUser = "admin_rec"
$adminPass = "Admin123!"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login
Write-Host "Logging in as Super Admin..."
$loginUrl = "$baseUrl/api/login"
$body = @{ username = $adminUser; password = $adminPass } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $body -ContentType "application/json" -SessionVariable global:session

    Write-Host "Login successful."
}
catch {
    Write-Error "Login failed: $_"
    exit 1
}

# 2. List Schools (Before Creation)
Write-Host "`n--- Listing Schools (Initial) ---"
try {
    $schoolsBefore = Invoke-RestMethod -Uri "$baseUrl/api/schools" -Method Get -WebSession $session
    Write-Host "Total Schools: $($schoolsBefore.Count)"
}
catch {
    Write-Error "Failed to list schools: $_"
    exit 1
}

# 3. Create School
Write-Host "`n--- Creating New School 'Test Admin Console Academy' ---"
$newSchoolData = @{
    name          = "Test Admin Console Academy"
    code          = "TACA-$(Get-Random)"
    addressBox    = "123 Admin St"
    contactPhones = "0777000000"
    motto         = "Testing is Believing"
} | ConvertTo-Json

$createdSchool = $null
try {
    $createdSchool = Invoke-RestMethod -Uri "$baseUrl/api/schools" -Method Post -Body $newSchoolData -ContentType "application/json" -WebSession $session
    Write-Host "Created School ID: $($createdSchool.id)"
}
catch {
    Write-Error "Failed to create school: $_"
    exit 1
}

# 4. Update School
if ($createdSchool) {
    Write-Host "`n--- Updating School ---"
    $updateData = @{
        name  = "Test Admin Console Academy (Updated)"
        email = "updated@test.com"
    } | ConvertTo-Json

    try {
        $updatedSchool = Invoke-RestMethod -Uri "$baseUrl/api/schools/$($createdSchool.id)" -Method Put -Body $updateData -ContentType "application/json" -WebSession $session
        if ($updatedSchool.name -eq "Test Admin Console Academy (Updated)") {
            Write-Host "SUCCESS: School name updated." -ForegroundColor Green
        }
        else {
            Write-Error "FAILURE: School name mismatch."
        }
    }
    catch {
        Write-Error "Failed to update school: $_"
    }
}

# 5. Delete School (Soft Delete / Deactivate)
if ($createdSchool) {
    Write-Host "`n--- Deleting (Deactivating) School ---"
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/schools/$($createdSchool.id)" -Method Delete -WebSession $session
        Write-Host "SUCCESS: Delete request sent." -ForegroundColor Green
        
        # Verify it's gone from standard list or marked inactive
        # Note: Super Admin might still see it, need to check isActive flag if possible or check if it's filtered out from normal 'switch' list
        $schoolsAfter = Invoke-RestMethod -Uri "$baseUrl/api/schools" -Method Get -WebSession $session
        $deletedSchool = $schoolsAfter | Where-Object { $_.id -eq $createdSchool.id }
        
        if ($deletedSchool) {
            if ($deletedSchool.isActive -eq $false) {
                Write-Host "SUCCESS: School exists but is marked Inactive (Soft Delete)." -ForegroundColor Green
            }
            else {
                Write-Error "FAILURE: School still exists and is ACTIVE."
            }
        }
        else {
            Write-Host "SUCCESS: School removed from list." -ForegroundColor Green
        }

    }
    catch {
        Write-Error "Failed to delete school: $_"
    }
}

Write-Host "`nDone."
