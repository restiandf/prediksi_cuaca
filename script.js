document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchLoadingIndicator = document.getElementById('searchLoadingIndicator');
    
    // Unified search handler function
    async function handleSearch() {
        const cityName = searchInput.value.trim();
        if (!cityName) return;

        try {
            // Show loading indicator
            searchLoadingIndicator.classList.remove('hidden');
            searchButton.classList.add('hidden');
            document.getElementById('loadingIndicator').classList.remove('hidden');
            
            // Call the search function
            await searchCity(cityName);
            
        } catch (error) {
            console.error('Error during search:', error);
            alert('Terjadi kesalahan saat mencari kota');
        } finally {
            // Hide loading indicators
            searchLoadingIndicator.classList.add('hidden');
            searchButton.classList.remove('hidden');
            document.getElementById('loadingIndicator').classList.add('hidden');
        }
    }

    // Event listeners for search
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    searchButton.addEventListener('click', handleSearch);
});

const API_KEY = '84db96f9e7b9149ecc4e3dee586d4d4a';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Fungsi untuk mengambil data cuaca
async function getWeatherData(city) {
    try {
        // Pertama, cari detail lokasi menggunakan Nominatim API
        const locationQuery = `${city}, Indonesia`;
        const nominatimResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=1&countrycodes=id&accept-language=id&addressdetails=1`,
            {
                headers: {
                    'Accept-Language': 'id'
                }
            }
        );
        const locationData = await nominatimResponse.json();

        if (!locationData.length) {
            throw new Error('Kota tidak ditemukan');
        }

        const location = locationData[0];

        // Kemudian ambil data cuaca menggunakan OpenWeather API
        const weatherResponse = await fetch(
            `${BASE_URL}?q=${city}&appid=${API_KEY}&units=metric&lang=id`
        );
        
        if (!weatherResponse.ok) {
            throw new Error('Data cuaca tidak ditemukan');
        }
        
        const weatherData = await weatherResponse.json();
        
        // Gabungkan data dari kedua API
        const combinedData = {
            ...weatherData,
            locationDetails: {
                province: location.address.state || location.address.province || '-',
                district: location.address.county || location.address.district || '-',
                subDistrict: location.address.suburb || location.address.village || '-',
                fullAddress: location.display_name
            }
        };
        
        // Update UI dengan data gabungan
        updateWeatherUI({
            city: combinedData.name,
            temperature: Math.round(combinedData.main.temp),
            description: combinedData.weather[0].description,
            humidity: combinedData.main.humidity,
            windSpeed: Math.round(combinedData.wind.speed * 3.6),
            icon: combinedData.weather[0].icon,
            feelsLike: Math.round(combinedData.main.feels_like)
        });
        
        // Update informasi lokasi dengan data yang lebih lengkap
        updateLocationInfo({
            ...combinedData,
            state: combinedData.locationDetails.province,
            district: combinedData.locationDetails.district,
            subDistrict: combinedData.locationDetails.subDistrict,
            coord: {
                lat: location.lat,
                lon: location.lon
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat mengambil data: ' + error.message);
    }
}

// Fungsi untuk memperbarui UI
function updateWeatherUI(weatherData) {
    // Update nama kota
    document.querySelector('h2').textContent = weatherData.city;
    
    // Update tanggal
    const currentDate = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('id-ID', options);
    
    // Update suhu dan deskripsi
    document.querySelector('.text-5xl').textContent = `${weatherData.temperature}°C`;
    document.querySelector('.text-xl.text-gray-600').textContent = 
        weatherData.description.charAt(0).toUpperCase() + weatherData.description.slice(1);
    
    // Update icon cuaca
    document.querySelector('img').src = 
        `https://openweathermap.org/img/wn/${weatherData.icon}@4x.png`;
    
    // Update detail cuaca
    document.querySelectorAll('.text-xl.font-bold')[0].textContent = `${weatherData.humidity}%`;
    document.querySelectorAll('.text-xl.font-bold')[1].textContent = `${weatherData.windSpeed} km/h`;
    
    // Tentukan UV Index berdasarkan suhu yang terasa
    let uvIndex = 'Rendah';
    if (weatherData.feelsLike > 32) {
        uvIndex = 'Tinggi';
    } else if (weatherData.feelsLike > 27) {
        uvIndex = 'Sedang';
    }
    document.querySelectorAll('.text-xl.font-bold')[2].textContent = uvIndex;
}

// Event listener untuk search input
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        getWeatherData(this.value);
    }
});

// Load data cuaca default saat halaman dimuat
window.addEventListener('load', () => {
    getWeatherData('Jakarta');
});

// Inisialisasi grafik cuaca
const ctx = document.getElementById('weatherChart').getContext('2d');
const weatherChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
        datasets: [{
            label: 'Suhu (°C)',
            data: [29, 28, 27, 30, 29, 28, 27],
            fill: false,
            borderColor: 'rgb(59, 130, 246)',
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        animations: {
            tension: {
                duration: 1000,
                easing: 'linear',
                from: 1,
                to: 0,
                loop: true
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                suggestedMin: 20,
                suggestedMax: 35
            }
        }
    }
});

// Variabel global untuk menyimpan kota yang aktif
let currentCity = 'Jakarta';

// Fungsi untuk mengupdate data cuaca berdasarkan waktu dan kota
async function updateWeatherByTime(city) {
    const API_KEY = '84db96f9e7b9149ecc4e3dee586d4d4a';
    
    try {
        // Update judul kota
        document.querySelector('h2.text-3xl').textContent = city;
        
        // Mengambil data cuaca per jam (forecast)
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        if (!response.ok) {
            throw new Error('Kota tidak ditemukan');
        }
        const data = await response.json();

        // Update data cuaca utama
        const currentWeather = data.list[0];
        document.querySelector('.text-5xl.font-bold.text-blue-600').textContent = 
            `${Math.round(currentWeather.main.temp)}°C`;
        document.querySelector('.text-xl.text-gray-600.mt-2').textContent = 
            currentWeather.weather[0].description;

        // Update tanggal
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = 
            today.toLocaleDateString('id-ID', options);

        // Fungsi untuk mencari data cuaca terdekat dengan waktu tertentu
        function findClosestForecast(hour) {
            return data.list.find(item => {
                const itemDate = new Date(item.dt * 1000);
                return itemDate.getHours() === hour;
            }) || data.list[0]; // Fallback ke data pertama jika tidak ditemukan
        }

        // Update data untuk setiap waktu
        const morning = findClosestForecast(6);
        document.getElementById('morningTemp').textContent = `${Math.round(morning.main.temp)}°C`;
        document.getElementById('morningIcon').src = `https://openweathermap.org/img/wn/${morning.weather[0].icon}@2x.png`;

        const noon = findClosestForecast(12);
        document.getElementById('noonTemp').textContent = `${Math.round(noon.main.temp)}°C`;
        document.getElementById('noonIcon').src = `https://openweathermap.org/img/wn/${noon.weather[0].icon}@2x.png`;

        const afternoon = findClosestForecast(17);
        document.getElementById('afternoonTemp').textContent = `${Math.round(afternoon.main.temp)}°C`;
        document.getElementById('afternoonIcon').src = `https://openweathermap.org/img/wn/${afternoon.weather[0].icon}@2x.png`;

        const night = findClosestForecast(20);
        document.getElementById('nightTemp').textContent = `${Math.round(night.main.temp)}°C`;
        document.getElementById('nightIcon').src = `https://openweathermap.org/img/wn/${night.weather[0].icon}@2x.png`;

        // Update detail cuaca
        document.querySelector('div:has(> p:contains("Kelembaban"))').querySelector('.text-xl.font-bold').textContent = 
            `${currentWeather.main.humidity}%`;
        document.querySelector('div:has(> p:contains("Kecepatan Angin"))').querySelector('.text-xl.font-bold').textContent = 
            `${Math.round(currentWeather.wind.speed * 3.6)} km/h`; // Konversi m/s ke km/h

    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Kota tidak ditemukan atau terjadi kesalahan');
    }
}

// Event listener untuk input pencarian
document.getElementById('searchInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const newCity = this.value.trim();
        if (newCity) {
            currentCity = newCity;
            updateWeatherByTime(currentCity);
        }
    }
});

// Event listener untuk tombol pencarian
document.querySelector('button.absolute').addEventListener('click', function() {
    const newCity = document.getElementById('searchInput').value.trim();
    if (newCity) {
        currentCity = newCity;
        updateWeatherByTime(currentCity);
    }
});

// Update data saat halaman dimuat
updateWeatherByTime(currentCity);

// Update data setiap 30 menit
setInterval(() => updateWeatherByTime(currentCity), 30 * 60 * 1000); 

document.addEventListener('DOMContentLoaded', function() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date();
    document.getElementById('currentDate').textContent = date.toLocaleDateString('id-ID', options);
}); 

// Fungsi untuk mencari detail lokasi berdasarkan nama kota
async function searchCity(cityName) {
  try {
    const query = `${cityName}, Indonesia`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=id&accept-language=id&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'id'
        }
      }
    );
    const data = await response.json();

    if (data.length > 0) {
      // Prioritaskan hasil pencarian berdasarkan tipe kota
      const cityResult = data.find(item => 
        (item.addresstype === 'city' || item.address.city) &&
        item.type === 'administrative'
      );
      
      // Jika tidak ditemukan kota, gunakan hasil pertama
      const bestMatch = cityResult || data[0];
      
      // Update informasi lokasi
      updateLocationUI({
        address: {
          city: bestMatch.address.city || bestMatch.name,
          state: bestMatch.address.state,
          district: bestMatch.address.district || bestMatch.address.county,
          subDistrict: bestMatch.address.suburb || bestMatch.address.village,
        },
        lat: bestMatch.lat,
        lon: bestMatch.lon
      });
      
      // Ambil data cuaca untuk kota yang ditemukan
      getWeatherData(bestMatch.address.city || bestMatch.name);
    } else {
      throw new Error('Kota tidak ditemukan');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Maaf, kota tidak ditemukan atau terjadi kesalahan');
  }
}

// Fungsi untuk mendapatkan detail lokasi berdasarkan koordinat
async function getLocationDetails(lat, lon) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id`
  );
  return await response.json();
}

// Fungsi untuk memperbarui UI
function updateLocationUI(locationData) {
    const address = locationData.address;
    
    // Update informasi wilayah dengan detail yang lebih lengkap
    document.getElementById('province').textContent = address.state || '-';
    document.getElementById('country').textContent = 'Indonesia';
    document.getElementById('timezone').textContent = 'WIB (UTC+7)';
    
    // Update nama kota dan detail wilayah
    const cityName = address.city || address.town || address.village || '-';
    const district = address.county || address.district || '-';
    const subDistrict = address.suburb || address.village || '-';
    
    document.getElementById('cityName').textContent = cityName;
    document.getElementById('district').textContent = district;
    document.getElementById('subDistrict').textContent = subDistrict;
    document.getElementById('regionName').textContent = `${address.state || ''}, Indonesia`;
    
    // Update koordinat dengan format yang lebih rapi
    const coordinates = `${Number(locationData.lat).toFixed(4)}°, ${Number(locationData.lon).toFixed(4)}°`;
    document.getElementById('coordinates').textContent = coordinates;
}

// Event listener untuk input pencarian
document.getElementById('searchInput').addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const cityName = e.target.value.trim();
    if (cityName) {
      // Tampilkan loading indicator
      document.getElementById('loadingIndicator').classList.remove('hidden');
      
      await searchCity(cityName);
      
      // Sembunyikan loading indicator
      document.getElementById('loadingIndicator').classList.add('hidden');
    }
  }
}); 

// Fungsi untuk mengupdate informasi wilayah
function updateLocationInfo(data) {
    // Helper function untuk update elemen dengan safety check
    const safeUpdateElement = (elementId, value) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    };

    // Update semua elemen dengan safety check
    safeUpdateElement('province', data.state || '-');
    safeUpdateElement('country', 'Indonesia');
    safeUpdateElement('timezone', 'WIB (UTC+7)');
    safeUpdateElement('district', data.district || '-');
    safeUpdateElement('subDistrict', data.subDistrict || '-');
    
    // Update koordinat dengan safety check
    const coordinates = `${Number(data.coord.lat).toFixed(4)}°, ${Number(data.coord.lon).toFixed(4)}°`;
    safeUpdateElement('coordinates', coordinates);

    // Update informasi cuaca harian dengan safety check
    if (data.sys) {
        safeUpdateElement('sunrise', formatTime(data.sys.sunrise * 1000));
        safeUpdateElement('sunset', formatTime(data.sys.sunset * 1000));
    }
    safeUpdateElement('rain', data.rain ? `${data.rain['1h']} mm` : '0 mm');
    safeUpdateElement('visibility', `${(data.visibility / 1000).toFixed(1)} km`);
}

// Fungsi helper untuk format timezone
function formatTimezone(offset) {
    const hours = Math.floor(offset / 3600);
    const sign = hours >= 0 ? '+' : '';
    return `${sign}${hours}:00`;
}

// Fungsi helper untuk format waktu
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
} 

function handleSearch() {
    const newCity = document.getElementById('searchInput').value.trim();
    if (newCity) {
        currentCity = newCity;
        updateWeatherByTime(currentCity);
    }
} 