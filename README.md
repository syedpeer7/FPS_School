# 🛣️ FPS & School Road Distance Dashboard

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Available-brightgreen)](https://fps-school.vercel.app)
[![Status](https://img.shields.io/badge/Status-Active-success)]()
[![License](https://img.shields.io/badge/License-MIT-blue)]()

## 📋 Overview

The **FPS & School Road Distance Dashboard** is a web-based application that calculates and visualizes actual road distances between Fair Price Shops (FPS/MLS) and Government Schools. This tool helps administrators and policymakers understand the accessibility of Fair Price Shops from educational institutions for better resource planning and distribution.

🌐 **Live Application**: [https://fps-school.vercel.app](https://fps-school.vercel.app)

## ✨ Features

### 🎯 Core Functionality
- **Road Distance Calculation**: Uses real routing services to calculate actual travel distances (not straight-line)
- **Interactive Map Visualization**: Dynamic map with color-coded markers based on distance ranges
- **Comprehensive Analytics**: Detailed statistics on FPS-School proximity relationships
- **Multi-Format Export**: PDF summaries and CSV data export capabilities

### 📊 Data Analysis
- **Distance Categories**: 
  - Schools < 1km from nearest FPS
  - Schools 1-2km from nearest FPS  
  - Schools 2-5km from nearest FPS
  - Schools > 5km from nearest FPS
- **Supply Analysis**: Identifies which FPS shops serve nearby schools
- **Statistical Summary**: Total counts of FPS, schools, and students

### 🗺️ Interactive Features
- **Route Visualization**: Show/hide individual or multiple routes
- **Marker Clustering**: FPS and school locations with popup information
- **Legend System**: Clear visual indicators for different distance ranges
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### 📁 Export Options
- **PDF Summary**: Download formatted summary reports
- **CSV Export**: Export FPS-School pairs within 1km for further analysis
- **Sample Data**: Download sample CSV format for reference

## 🚀 Quick Start

### Option 1: Use Online (Recommended)
1. Visit [https://fps-school.vercel.app](https://fps-school.vercel.app)
2. Download the sample CSV to understand the format
3. Upload your own CSV data
4. Analyze results and export as needed

### Option 2: Local Installation
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fps-school-dashboard
   ```

2. **File Structure**
   ```
   fps-school-dashboard/
   ├── index.html
   ├── styles.css
   ├── script.js
   └── README.md
   ```

3. **Run locally**
   - Open `index.html` in any modern web browser
   - No server setup required - it's a pure client-side application

## 📝 CSV Data Format

### Required Columns
| Column Name | Description | Example |
|-------------|-------------|---------|
| `District name` | Administrative district | Krishna |
| `District code` | Numeric district code | 547 |
| `Mandal name` | Sub-district/Mandal name | Penamaluru |
| `Mandal code` | Numeric mandal code | 547018 |
| `MLS name` | Fair Price Shop name | VUYYURU |
| `shop_no` | Unique shop identifier | 618034 |
| `name_of_the_school` | School name | MPPS GC YANAMALAKUDURU |
| `FPS Lattitude` | FPS latitude coordinates | 16.4414356 |
| `FPS Logitude` | FPS longitude coordinates | 80.7424707 |
| `School Lattitude` | School latitude coordinates | 16.481446 |
| `School Longitude` | School longitude coordinates | 80.665719 |
| `status` | Active/Inactive status | Active |

### Data Requirements
- **Coordinates**: Must be in decimal degrees format
- **Missing Data**: Use `#N/A` for missing coordinates
- **Status**: Both FPS and schools should have 'Active' status
- **Encoding**: CSV should be UTF-8 encoded

## 🔧 Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **Routing**: OSRM (Open Source Routing Machine) API
- **CSV Processing**: PapaParse library
- **PDF Generation**: jsPDF library
- **Styling**: Custom CSS with modern gradients and animations

## 📱 Browser Support

- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (limited support)

## 🎨 User Interface

### Design Principles
- **Modern Gradient UI**: Contemporary design with glassmorphism effects
- **Responsive Layout**: Adapts to all screen sizes
- **Intuitive Navigation**: Clear visual hierarchy and user-friendly controls
- **Accessibility**: Proper contrast ratios and semantic markup

### Color Coding
- 🔴 **Red**: FPS markers and schools >5km from FPS
- 🔵 **Blue**: Default school markers
- 🟢 **Green**: Schools <1km from nearest FPS
- 🟠 **Orange**: Schools 1-2km from nearest FPS
- 🟤 **Brown**: Schools 2-5km from nearest FPS

## 📈 Performance

- **Routing Requests**: Throttled to prevent API overload (150ms delay between requests)
- **Error Handling**: Fallback to straight-line distance calculation
- **Progress Tracking**: Real-time progress indicators during processing
- **Memory Management**: Efficient marker and route management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, issues, or feature requests:
- 🌐 Visit: [https://fps-school.vercel.app](https://fps-school.vercel.app)
- 📧 Create an issue in the repository
- 📖 Check the documentation below

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🙏 Acknowledgments

- OpenStreetMap contributors for map data
- OSRM project for routing services
- Leaflet.js community for mapping libraries
- All contributors and users of this application

---

**Made with ❤️ for better FPS-School accessibility analysis**

🔗 **Live Demo**: [https://fps-school.vercel.app](https://fps-school.vercel.app)
