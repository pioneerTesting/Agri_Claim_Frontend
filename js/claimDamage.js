let map, marker, drawnItems; // Global variables for map, marker, and drawn items

      // Handle Photo Selection & Preview
      function handlePhotoSelect(event) {
        const files = event.target.files;
        if (files.length > 10) {
          alert("You can upload a maximum of 10 images.");
          event.target.value = "";
          return;
        }
        const previewContainer = document.getElementById("imagePreview");
        previewContainer.innerHTML = "";
        Array.from(files).forEach((file, index) => {
          if (index < 10) {
            const reader = new FileReader();
            reader.onload = function (e) {
              const img = document.createElement("img");
              img.src = e.target.result;
              img.classList.add("w-16", "h-16", "rounded", "object-cover");
              previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
          }
        });
      }

      // Handle Document Selection & Preview
      function handleDocumentSelect(event) {
        const files = event.target.files;
        if (files.length > 10) {
          alert("You can upload a maximum of 10 documents.");
          event.target.value = "";
          return;
        }
        const previewContainer = document.getElementById("documentPreview");
        previewContainer.innerHTML = "";
        Array.from(files).forEach((file) => {
          const fileElement = document.createElement("p");
          fileElement.textContent = file.name;
          fileElement.classList.add("text-sm", "mt-1");
          previewContainer.appendChild(fileElement);
        });
      }

      // Helper: Convert file to Base64 data using a Promise
      function convertFileToBase64(file) {
        return new Promise((resolve, reject) => {
          let reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            resolve({
              fileName: file.name,
              fileType: file.type,
              base64Data: reader.result.split(",")[1],
            });
          };
          reader.onerror = (error) => reject(error);
        });
      }

      // Submit Data: Process both images and documents
      function submitData() {

        const imageFiles = document.getElementById("uploadPhoto").files;
        const documentFiles = document.getElementById("uploadDocument").files;
        const token = sessionStorage.getItem("globalNewGeneratedToken");
        const username = sessionStorage.getItem("globalAuthUsername");

        const imagePromises = Array.from(imageFiles).map((file) =>
          convertFileToBase64(file)
        );
        const documentPromises = Array.from(documentFiles).map((file) =>
          convertFileToBase64(file)
        );

        Promise.all(imagePromises)
          .then((imageList) => {
            return Promise.all(documentPromises).then((documentList) => {
              return { imageList, documentList };
            });
          })
          .then(({ imageList, documentList }) => {
            const payload = {
              authenticateUsername: username,
              images: imageList,
              documents: documentList,
              damageLocation: drawnShapes
            };
            console.log("Payload to send:", payload);
            sendData(payload, token);
            // logAllCoordinates()
            })
          .catch((error) => {
            console.error("Error processing files:", error);
          });
      }

      // Send Data to API
      function sendData(payload, token) {
        $.ajax({
          url: "http://localhost:9010/workflow/upload/damages",
          type: "POST",
          contentType: "application/json",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          data: JSON.stringify(payload),
          success: function (response) {
            alert("Success: " + response);
            console.log(response);
            if(response.status == "Success"){

              Swal.fire({
                title: "Success",
                text: "Claimed Send Successfully",
                icon: "success",
                showCancelButton: false,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Continue"
              }).then((result) => {
                if (result.isConfirmed) {
                  location.reload();
                }
              });
            }
          },
          error: function (error) {
            alert("Error uploading files.");
            console.error(error);
          },
        });
      }

      // Update coordinates display
      function updateCoordinates(lat, lng) {
        document.getElementById("coordinates").textContent =
          "Latitude: " + lat.toFixed(5) + ", Longitude: " + lng.toFixed(5);
      }

      // Compute area of a given layer (in square feet)
      function computeArea(layer) {
        const geojson = layer.toGeoJSON();
        // Turf.js returns area in square meters
        const areaSqMeters = turf.area(geojson);
        const areaSqFeet = areaSqMeters * 10.7639;
        return areaSqFeet;
      }

      // Calculate the total area from all drawn layers
      function calculateTotalArea() {
        let totalArea = 0;
        drawnItems.eachLayer(function (layer) {
          totalArea += computeArea(layer);
        });
        return totalArea;
      }

      // Alert the total area in square feet
      function alertTotalArea() {
        const totalArea = calculateTotalArea();
        alert("Total Area: " + totalArea.toFixed(2) + " sq feet");
      }

      // Initialize the map using Leaflet, add draggable marker, drawing tools, and area calculation
      function initMap(latitude, longitude) {
        // If map instance doesn't exist, create it
        if (!map) {
          map = L.map("map").setView([latitude, longitude], 13);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
          }).addTo(map);

          // Initialize feature group to store drawn items
          drawnItems = new L.FeatureGroup();
          map.addLayer(drawnItems);

          // Initialize Leaflet.draw controls
          var drawControl = new L.Control.Draw({
            edit: {
              featureGroup: drawnItems,
              remove: true,
            },
            draw: {
              polygon: true,
              rectangle: true,
              polyline: false,
              circle: false,
              marker: false,
              circlemarker: false,
            },
          });
          map.addControl(drawControl);

          let drawnShapes = []; // Array to store all drawn shapes' coordinates

          // Listen for created layers (drawn shapes)
          map.on("draw:created", function (e) {
            var layer = e.layer;
            drawnItems.addLayer(layer);

            // Optional: Log the coordinates of the drawn shape
            if (e.layerType === "polygon" || e.layerType === "rectangle") {
              const latlngs = layer.getLatLngs();
            //   console.log("Drawn area coordinates:", latlngs);
              drawnShapes.push(latlngs);
            }
            // alertTotalArea();
            updateStoredCoordinates()
          });

          // Listen for edits on drawn layers
          map.on("draw:edited", function (e) {
            // alertTotalArea();
            updateStoredCoordinates()
          });

          // Listen for deletion of drawn layers
          map.on("draw:deleted", function () {
            // alertTotalArea();
            updateStoredCoordinates()
          });
        } else {
          // Re-center the map if it already exists
          map.setView([latitude, longitude], 13);
        }

        // Create or move the draggable marker.
        if (!marker) {
          marker = L.marker([latitude, longitude], { draggable: false }).addTo(
            map
          );
          //marker.bindPopup("Drag me to adjust your location").openPopup();
          // Update coordinates when the marker is dragged.
          marker.on("dragend", function (e) {
            const newPos = e.target.getLatLng();
            // updateCoordinates(newPos.lat, newPos.lng);
          });
        } else {
          marker.setLatLng([latitude, longitude]);
        }
        // updateCoordinates(latitude, longitude);
      }

        // Function to update stored coordinates when shapes are added/edited/deleted
        function updateStoredCoordinates() {
            drawnShapes = []; // Reset the array
            drawnItems.eachLayer(function (layer) {
                if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                    drawnShapes.push(layer.getLatLngs());
                }
            });
        }
        // Function to log all drawn shapes' coordinates
        function logAllCoordinates() {
            console.log("All Drawn Shapes' Coordinates:", drawnShapes);
        }

      // Get the user's current location using the Geolocation API
      function getUserLocation(callback) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (position) {
              const latitude = position.coords.latitude;
              const longitude = position.coords.longitude;
              if (callback && typeof callback === "function") {
                callback(latitude, longitude);
              } else {
                initMap(latitude, longitude);
              }
            },
            function (error) {
              document.getElementById("map").innerHTML =
                "<p class='text-lg text-red-500'>Unable to retrieve location.</p>";
              console.error("Error getting location:", error);
            }
          );
        } else {
          document.getElementById("map").innerHTML =
            "<p class='text-lg text-red-500'>Geolocation is not supported by your browser.</p>";
        }
      }

      // Function to re-locate and update the marker to the user's current location
      function reLocate() {
        getUserLocation(function (latitude, longitude) {
          initMap(latitude, longitude);
        });
      }

      // Initialize map on page load with user's current location
      getUserLocation();