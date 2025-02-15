let token;
let username;
document.addEventListener("DOMContentLoaded", function () {
    token = sessionStorage.getItem("globalNewGeneratedToken");
    username = sessionStorage.getItem("globalAuthUsername");

    console.log("Token:", token);
    console.log("Username:", username);

    $.ajax({
        url: 'http://localhost:9010/workflow/dashboard/getuserdata',
        type: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        xhrFields: {
            withCredentials: true 
        },
        data: JSON.stringify({
            "email": username,
            "authenticateUsername": username
        }),
        success: function(response) {
            console.log('Signup successful:', response);
            if(response.status == "Failure"){
                alert(response.message);
            }else if(response.status == "Success"){
                document.getElementById("userName").innerText = response.name;
                document.getElementById("userGender").innerText = response.gender;
                document.getElementById("userDob").innerText = response.dob;
                document.getElementById("userAddress").innerText = response.address;
                if(response.gender == "Female"){
                    document.getElementById("profileImage").src = "/image/female_face.webp";
                }else if(response.gender == "Male"){
                    document.getElementById("profileImage").src = "/image/male_face.webp";
                }
            }
            
        },
        error: function(xhr, status, error) {
            console.error('Signup failed:', xhr.responseText);
            alert("Signup Failed! Check Console for details.");
        }
    });

});

function openClaimDamage(){
    window.location.replace("http://127.0.0.1:5500/dashboard/claimdamage.html");
}