/**
 * Generate test Excel files with subject data from the reference PDF:
 * "ESTE UG I to VIII SEM MAY 2026 - R2021"
 * Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam
 *
 * Run with: bun scripts/gen-test-data.js
 *
 * Note: For Sem 1 & 2 common subjects, department is set to CSE as a
 * default offering department. The scheduling engine treats semesterNumber
 * 1 & 2 as common for all departments regardless of departmentId.
 */
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";

// ── SEMESTER I (Page 1) — All Programmes, common ────────────────────
const sem1 = [
  { code: "UPH2176", name: "Engineering Physics", semester: 1, department: "CSE", elective: "" },
  { code: "UMA2176", name: "Matrices and Calculus", semester: 1, department: "CSE", elective: "" },
  { code: "UCY2176", name: "Engineering Chemistry", semester: 1, department: "CSE", elective: "" },
  { code: "UGE2177", name: "Engineering Graphics", semester: 1, department: "CSE", elective: "" },
  { code: "UGA2176", name: "Heritage of Tamils", semester: 1, department: "CSE", elective: "" },
  { code: "UGE2176", name: "Problem Solving and Programming in Python", semester: 1, department: "CSE", elective: "" },
];

// ── SEMESTER II (Page 2) — Per-department subjects ──────────────────
const sem2 = [
  // Common to all departments
  { code: "UMA2276", name: "Complex Functions and Laplace Transforms", semester: 2, department: "CSE", elective: "" },
  { code: "UGA2276", name: "Tamils and Technology", semester: 2, department: "CSE", elective: "" },

  // Civil
  { code: "UHS2342", name: "Application of Psychology in Everyday Life", semester: 2, department: "CIVIL", elective: "", tcp: "yes" },
  { code: "UCE2202", name: "Engineering Mechanics for Civil Engineering", semester: 2, department: "CIVIL", elective: "" },

  // Mechanical
  { code: "UME2302", name: "Engineering Mechanics", semester: 2, department: "MECH", elective: "" },
  { code: "UCE2254", name: "Solid Mechanics for Technologists", semester: 2, department: "CIVIL", elective: "" },

  // Common across Civil, Mech, Chem, CSE, IT
  { code: "UEE2276", name: "Basic Electrical and Electronics Engineering", semester: 2, department: "EEE", elective: "" },

  // EEE
  { code: "UEC2201", name: "Fundamentals of Electronic Devices and Circuits", semester: 2, department: "ECE", elective: "" },
  { code: "UME2251", name: "Engineering Mechanics for Electrical Engineers", semester: 2, department: "MECH", elective: "" },

  // ECE
  { code: "UHS2343", name: "Film Appreciation", semester: 2, department: "ECE", elective: "", tcp: "yes" },
  { code: "UEE2251", name: "Basic Electrical and Instrumentation Engineering", semester: 2, department: "EEE", elective: "" },
  { code: "UVC2002", name: "Circuit Analysis", semester: 2, department: "ECE", elective: "" },

  // BME
  { code: "UBM2203", name: "Sensors for Healthcare", semester: 2, department: "BME", elective: "" },
  { code: "UBM2202", name: "Fundamentals of Electronic Devices and Circuits", semester: 2, department: "BME", elective: "" },
  { code: "UBM2201", name: "Basics of Electric Circuit Analysis", semester: 2, department: "BME", elective: "" },

  // CSE
  { code: "UCN2302", name: "Foundations of Data Science", semester: 2, department: "CSE", elective: "" },

  // IT
  { code: "UIT2201", name: "Programming Data Structures", semester: 2, department: "IT", elective: "", tcp: "yes" },
  { code: "UPH2251", name: "Physics for Information Science and Technology", semester: 2, department: "IT", elective: "" },
];

// ── SEMESTER III (Page 3) — Per-department subjects ─────────────────
const sem3 = [
  // Civil
  { code: "UMA2351", name: "Statistics and Numerical Methods for Civil Engineering", semester: 3, department: "CIVIL", elective: "" },
  { code: "UCE2301", name: "Construction Materials, Techniques and Practices", semester: 3, department: "CIVIL", elective: "" },
  { code: "UCE2302", name: "Fluid Mechanics", semester: 3, department: "CIVIL", elective: "" },
  { code: "UCE2303", name: "Engineering Geology", semester: 3, department: "CIVIL", elective: "" },
  { code: "UCE2304", name: "Strength of Materials", semester: 3, department: "CIVIL", elective: "" },
  { code: "UHS2376", name: "Universal Human Values-2 Understanding Harmony", semester: 3, department: "CIVIL", elective: "", tcp: "yes" },

  // Mechanical
  { code: "UMA2352", name: "Statistics and Numerical Methods for Mechanical Engineering", semester: 3, department: "MECH", elective: "" },
  { code: "UME2301", name: "Engineering Thermodynamics", semester: 3, department: "MECH", elective: "" },
  { code: "UME2304", name: "Mechanics of Solids", semester: 3, department: "MECH", elective: "" },
  { code: "UME2303", name: "Manufacturing Processes", semester: 3, department: "MECH", elective: "" },
  { code: "UME2302", name: "Fluid Mechanics and Machinery", semester: 3, department: "MECH", elective: "" },

  // Chemical
  { code: "UMA2376", name: "Transform Techniques and Partial Differential Equations", semester: 3, department: "CHEM", elective: "" },
  { code: "UCH2317", name: "Principles of Electronics Engineering", semester: 3, department: "CHEM", elective: "", tcp: "yes" },
  { code: "UCH2304", name: "Food Engineering", semester: 3, department: "CHEM", elective: "" },
  { code: "UCH2302", name: "Chemical Process Industries", semester: 3, department: "CHEM", elective: "" },
  { code: "UCH2317", name: "Chemical Process Calculations", semester: 3, department: "CHEM", elective: "" },

  // EEE
  { code: "UEE2376", name: "Signals and Systems", semester: 3, department: "EEE", elective: "" },
  { code: "UEE2302", name: "OOPS and Data Structures for Electrical Engineering", semester: 3, department: "EEE", elective: "" },
  { code: "UEE2305", name: "Electronic Devices and Circuits", semester: 3, department: "EEE", elective: "" },

  // ECE
  { code: "UEC2376", name: "Signals and Systems", semester: 3, department: "ECE", elective: "" },
  { code: "UEC2304", name: "Digital System Design", semester: 3, department: "ECE", elective: "", tcp: "yes" },
  { code: "UEC2305", name: "OOPS and Data Structures", semester: 3, department: "ECE", elective: "" },
  { code: "UEC2301", name: "Analog Circuits", semester: 3, department: "ECE", elective: "" },

  // BME
  { code: "UBM2371", name: "Fundamentals of System Design", semester: 3, department: "BME", elective: "" },
  { code: "UBM2302", name: "Human Anatomy and Physiology", semester: 3, department: "BME", elective: "" },
  { code: "UBM2301", name: "Analog and Digital Integrated Circuits", semester: 3, department: "BME", elective: "" },

  // CSE
  { code: "UMA2377", name: "Discrete Mathematics", semester: 3, department: "CSE", elective: "" },
  { code: "UCS2301", name: "Digital Principles and System Design", semester: 3, department: "CSE", elective: "" },
  { code: "UCS2402", name: "Data Structures", semester: 3, department: "CSE", elective: "" },
  { code: "UCS2301", name: "Object Oriented Programming", semester: 3, department: "CSE", elective: "" },

  // IT
  { code: "UIT2304", name: "Digital Logic and Computer Organisation", semester: 3, department: "IT", elective: "" },
  { code: "UIT2502", name: "Introduction to Digital Communication", semester: 3, department: "IT", elective: "" },
  { code: "UIT2301", name: "Programming Design Patterns", semester: 3, department: "IT", elective: "" },
  { code: "UIT2302", name: "Database Technology", semester: 3, department: "IT", elective: "" },
];

// ── SEMESTER IV (Page 4) — Per-department subjects ──────────────────
const sem4 = [
  // Civil
  { code: "UCE2402", name: "Surveying", semester: 4, department: "CIVIL", elective: "" },
  { code: "UCE2403", name: "Soil Mechanics", semester: 4, department: "CIVIL", elective: "" },
  { code: "UCE2404", name: "Applied Hydraulic Engineering", semester: 4, department: "CIVIL", elective: "" },
  { code: "UCE2405", name: "Structural Analysis", semester: 4, department: "CIVIL", elective: "" },
  { code: "UME2404", name: "Metrology and Measurements", semester: 4, department: "MECH", elective: "", tcp: "yes" },

  // Mechanical
  { code: "UME2401", name: "Kinematics of Machinery", semester: 4, department: "MECH", elective: "" },
  { code: "UME2405", name: "Material Science and Engineering Metallurgy", semester: 4, department: "MECH", elective: "" },
  { code: "UMA2403", name: "Thermal Engineering", semester: 4, department: "MECH", elective: "" },
  { code: "UME2402", name: "Manufacturing Processes II", semester: 4, department: "MECH", elective: "" },

  // Chemical
  { code: "UMA2431", name: "Numerical Methods for Chemical Engineering", semester: 4, department: "CHEM", elective: "", tcp: "yes" },
  { code: "UCH2403", name: "Chemical Engineering Thermodynamics-I", semester: 4, department: "CHEM", elective: "", tcp: "yes" },
  { code: "UCH2502", name: "Mechanical Operations", semester: 4, department: "CHEM", elective: "" },
  { code: "UCH2404", name: "Industrial Process Plant Safety", semester: 4, department: "CHEM", elective: "", tcp: "yes" },

  // EEE
  { code: "UMA2451", name: "Probability and Statistics for Electrical Engineering", semester: 4, department: "EEE", elective: "" },
  { code: "UEE2401", name: "Electrical Machines-II", semester: 4, department: "EEE", elective: "" },
  { code: "UEE2402", name: "Analog Electronic Circuits", semester: 4, department: "EEE", elective: "" },
  { code: "UEE2476", name: "Control Systems Engineering", semester: 4, department: "EEE", elective: "" },
  { code: "UEE2403", name: "Generation, Transmission and Distribution", semester: 4, department: "EEE", elective: "" },

  // ECE
  { code: "UEC2401", name: "Microcontrollers", semester: 4, department: "ECE", elective: "" },
  { code: "UEC2402", name: "Digital Signal Processing", semester: 4, department: "ECE", elective: "" },
  { code: "UEC2403", name: "Electromagnetic Fields", semester: 4, department: "ECE", elective: "" },
  { code: "UEC2476", name: "Control Systems Engineering", semester: 4, department: "ECE", elective: "" },
  { code: "UEC2404", name: "Principles of Communication Systems", semester: 4, department: "ECE", elective: "" },

  // BME
  { code: "UMA2454", name: "Statistics and Random Processes", semester: 4, department: "BME", elective: "" },
  { code: "UBM2403", name: "Medical Physics", semester: 4, department: "BME", elective: "" },
  { code: "UBM2402", name: "Pathology and Microbiology", semester: 4, department: "BME", elective: "" },
  { code: "UBM2405", name: "Signals, Systems and Signal Processing", semester: 4, department: "BME", elective: "" },
  { code: "UBM2404", name: "Biomaterials", semester: 4, department: "BME", elective: "" },

  // CSE
  { code: "UMA2476", name: "Probability and Statistics", semester: 4, department: "CSE", elective: "" },
  { code: "UCS2401", name: "Computer Organisation and Architecture", semester: 4, department: "CSE", elective: "" },
  { code: "UCS2402", name: "Operating Systems", semester: 4, department: "CSE", elective: "" },
  { code: "UCS2404", name: "Database Management Systems", semester: 4, department: "CSE", elective: "" },
  { code: "UCS2403", name: "Design and Analysis of Algorithms", semester: 4, department: "CSE", elective: "" },

  // IT
  { code: "UMA2456", name: "Probability and Statistics", semester: 4, department: "IT", elective: "" },
  { code: "UIT2401", name: "Microcontroller", semester: 4, department: "IT", elective: "" },
  { code: "UIT2402", name: "Automata Theory and Compiler Design", semester: 4, department: "IT", elective: "" },
  { code: "UIT2403", name: "Data Communication and Networks", semester: 4, department: "IT", elective: "" },
  { code: "UIT2404", name: "Advanced Data Structures and Algorithm Analysis", semester: 4, department: "IT", elective: "" },
];

// ── SEMESTER V (Page 5) — Per-department subjects ───────────────────
const sem5 = [
  // Common (Management subject across multiple depts)
  { code: "UBA2541", name: "Principles of Management", semester: 5, department: "CSE", elective: "" },
  { code: "UBA2545", name: "Work Ethics, Corporate Social Responsibility and Governance", semester: 5, department: "CSE", elective: "yes", tcp: "yes" },

  // Civil
  { code: "UCE2502", name: "Design of Reinforced Concrete Structures", semester: 5, department: "CIVIL", elective: "" },
  { code: "UCE2503", name: "Water Supply Engineering", semester: 5, department: "CIVIL", elective: "" },
  { code: "UCE2527", name: "Hydrology, Planning and Development", semester: 5, department: "CIVIL", elective: "" },
  { code: "UCE2501", name: "Geotechnical Engineering", semester: 5, department: "CIVIL", elective: "" },
  { code: "UCE2521", name: "Concrete Technology", semester: 5, department: "CIVIL", elective: "" },

  // Mechanical
  { code: "UMA2547", name: "Total Quality Management", semester: 5, department: "MECH", elective: "" },
  { code: "UME2505", name: "Design of Machine Elements", semester: 5, department: "MECH", elective: "" },
  { code: "UME2506", name: "Fundamentals of Heat Transfer", semester: 5, department: "MECH", elective: "" },
  { code: "UME2507", name: "Dynamics of Machines", semester: 5, department: "MECH", elective: "" },

  // Chemical
  { code: "UCH2502", name: "Chemical Reaction Engineering-II", semester: 5, department: "CHEM", elective: "" },
  { code: "UCH2507", name: "Mass Transfer I", semester: 5, department: "CHEM", elective: "" },
  { code: "UCH2504", name: "Process Dynamics and Control", semester: 5, department: "CHEM", elective: "", tcp: "yes" },
  { code: "UCH2526", name: "Food Technology", semester: 5, department: "CHEM", elective: "" },
  { code: "UCH2501", name: "Chemical Engineering Thermodynamics-II", semester: 5, department: "CHEM", elective: "" },

  // EEE
  { code: "UEE2502", name: "Electrical Machines-II", semester: 5, department: "EEE", elective: "" },
  { code: "UEE2503", name: "Electrical Instrumentation Systems", semester: 5, department: "EEE", elective: "" },
  { code: "UEE2504", name: "Digital Logic Systems and Practices", semester: 5, department: "EEE", elective: "", tcp: "yes" },
  { code: "UEE2525", name: "Solar Energy Systems", semester: 5, department: "EEE", elective: "" },
  { code: "UEE2505", name: "Power Electronics", semester: 5, department: "EEE", elective: "" },

  // ECE
  { code: "UEC2502", name: "Transmission Lines and Wave Guides", semester: 5, department: "ECE", elective: "" },
  { code: "UEC2504", name: "VLSI Design", semester: 5, department: "ECE", elective: "" },
  { code: "UEC2501", name: "Digital Communication", semester: 5, department: "ECE", elective: "" },
  { code: "UEC2505", name: "Communication Networks", semester: 5, department: "ECE", elective: "" },

  // BME
  { code: "UBM2504", name: "Biocontrol Systems", semester: 5, department: "BME", elective: "" },
  { code: "UBM2322", name: "Foundations of Medical Data Analytics", semester: 5, department: "BME", elective: "" },
  { code: "UBM2503", name: "Medical Imaging Systems", semester: 5, department: "BME", elective: "" },

  // CSE
  { code: "UCS2502", name: "Microprocessors, Microcontrollers and Interfacing", semester: 5, department: "CSE", elective: "" },
  { code: "UCS2504", name: "Foundations of Artificial Intelligence", semester: 5, department: "CSE", elective: "" },
  { code: "UCS2521", name: "Big Data Technology", semester: 5, department: "CSE", elective: "" },
  { code: "UCS2503", name: "Computer Networks", semester: 5, department: "CSE", elective: "" },

  // IT
  { code: "UIT2500", name: "Principles of Operating Systems", semester: 5, department: "IT", elective: "" },
  { code: "UIT2509", name: "Artificial Intelligence", semester: 5, department: "IT", elective: "" },
  { code: "UIT2521", name: "Information Theory and Applications", semester: 5, department: "IT", elective: "" },
  { code: "UIT2501", name: "Principles of Software Engineering", semester: 5, department: "IT", elective: "" },
  { code: "UIT2504", name: "Data Analytics and Visualization", semester: 5, department: "IT", elective: "" },
];

// ── SEMESTER VI (Page 6) — Per-department subjects ──────────────────
const sem6 = [
  // Civil
  { code: "UCE2601", name: "Design of Steel Structures", semester: 6, department: "CIVIL", elective: "" },
  { code: "UCE2602", name: "Principles of Geotechnical Engineering", semester: 6, department: "CIVIL", elective: "" },
  { code: "UCE2603", name: "Wastewater Engineering", semester: 6, department: "CIVIL", elective: "" },
  { code: "UCE2604", name: "Highway Engineering Optimization and Techniques", semester: 6, department: "CIVIL", elective: "" },
  { code: "UCE2621", name: "Advanced Structural Analysis", semester: 6, department: "CIVIL", elective: "" },

  // Mechanical
  { code: "UME2601", name: "Design of Mechanical Drives", semester: 6, department: "MECH", elective: "" },
  { code: "UME2602", name: "Mechanisms and Machinery", semester: 6, department: "MECH", elective: "" },
  { code: "UME2603", name: "Automobile Engineering", semester: 6, department: "MECH", elective: "" },
  { code: "UME2622", name: "Design Concepts in Engineering", semester: 6, department: "MECH", elective: "" },

  // Chemical
  { code: "UCH2601", name: "Chemical Reaction Engineering-II", semester: 6, department: "CHEM", elective: "" },
  { code: "UCH2603", name: "Mass Transfer II", semester: 6, department: "CHEM", elective: "" },
  { code: "UCH2604", name: "Process Economics", semester: 6, department: "CHEM", elective: "" },
  { code: "UCH2621", name: "Solid Waste Management", semester: 6, department: "CHEM", elective: "" },

  // EEE
  { code: "UEE2602", name: "Power System Analysis", semester: 6, department: "EEE", elective: "" },
  { code: "UEE2604", name: "Power System Operation and Control", semester: 6, department: "EEE", elective: "" },
  { code: "UEE2625", name: "Energy Storage Systems", semester: 6, department: "EEE", elective: "" },

  // ECE
  { code: "UEC2602", name: "System Design", semester: 6, department: "ECE", elective: "" },
  { code: "UEC2603", name: "Microwave and Antenna Engineering", semester: 6, department: "ECE", elective: "" },
  { code: "UEC2604", name: "Machine Learning and Image Processing", semester: 6, department: "ECE", elective: "" },
  { code: "UEC2625", name: "Advanced Microcontrollers", semester: 6, department: "ECE", elective: "" },

  // BME
  { code: "UBM2601", name: "Diagnostic Equipment", semester: 6, department: "BME", elective: "" },
  { code: "UBM2604", name: "Principles of Marketing", semester: 6, department: "BME", elective: "" },

  // CSE
  { code: "UCS2602", name: "Software System Design", semester: 6, department: "CSE", elective: "" },
  { code: "UCS2601", name: "Theory of Computation", semester: 6, department: "CSE", elective: "" },
  { code: "UCS2626", name: "Natural Language Processing", semester: 6, department: "CSE", elective: "" },

  // IT
  { code: "UIT2601", name: "Pattern Recognition Programming", semester: 6, department: "IT", elective: "" },
  { code: "UIT2602", name: "Web Technologies", semester: 6, department: "IT", elective: "" },
  { code: "UIT2603", name: "Internet of Things and Computation", semester: 6, department: "IT", elective: "" },
  { code: "UIT2627", name: "Introduction to AI/ML/DL", semester: 6, department: "IT", elective: "" },
];

// ── SEMESTER VII (Page 7) — Per-department subjects ─────────────────
const sem7 = [
  // Civil
  { code: "UCE2701", name: "Estimation and Costing", semester: 7, department: "CIVIL", elective: "" },
  { code: "UCE2702", name: "Railways, Airports and Harbour Engineering", semester: 7, department: "CIVIL", elective: "" },
  { code: "UCE2703", name: "Environmental Science and Engineering", semester: 7, department: "CIVIL", elective: "" },
  { code: "UCE2723", name: "Geo-Environmental Engineering", semester: 7, department: "CIVIL", elective: "" },
  { code: "UCE2726", name: "Prestressed Concrete Structures", semester: 7, department: "CIVIL", elective: "" },
  { code: "UCE2722", name: "Contract Laws and Regulations", semester: 7, department: "CIVIL", elective: "" },

  // Mechanical
  { code: "UME2701", name: "Industrial Practices", semester: 7, department: "MECH", elective: "" },
  { code: "UME2702", name: "Robot Technology", semester: 7, department: "MECH", elective: "" },
  { code: "UME2703", name: "Finite Element Analysis", semester: 7, department: "MECH", elective: "" },
  { code: "UME2721", name: "Computational Fluid Dynamics", semester: 7, department: "MECH", elective: "" },
  { code: "UME2746", name: "Electric Vehicles", semester: 7, department: "MECH", elective: "" },
  { code: "UME2734", name: "Principles of Energy Conservation Audit and Management", semester: 7, department: "MECH", elective: "" },

  // Chemical
  { code: "UCH2702", name: "Process Equipment Design", semester: 7, department: "CHEM", elective: "" },
  { code: "UCH2703", name: "Transport Phenomena", semester: 7, department: "CHEM", elective: "" },
  { code: "UME2776", name: "Product Design and Development", semester: 7, department: "MECH", elective: "", tcp: "yes" },

  // EEE
  { code: "UEE2701", name: "Solid State Drives", semester: 7, department: "EEE", elective: "" },
  { code: "UEE2702", name: "Protection and Switchgear", semester: 7, department: "EEE", elective: "" },
  { code: "UEE2703", name: "High Voltage Engineering", semester: 7, department: "EEE", elective: "" },
  { code: "UEE2724", name: "Power Semiconductor Devices", semester: 7, department: "EEE", elective: "" },
  { code: "UEE2721", name: "Smart Grid", semester: 7, department: "EEE", elective: "" },
  { code: "UEE2726", name: "Distributed Microgrid", semester: 7, department: "EEE", elective: "" },

  // ECE
  { code: "UEC2701", name: "High Frequency Electronic Systems", semester: 7, department: "ECE", elective: "" },
  { code: "UEC2703", name: "Embedded and Real Time Operating Systems", semester: 7, department: "ECE", elective: "" },
  { code: "UEC2702", name: "Electromagnetic Interference and Compatibility", semester: 7, department: "ECE", elective: "" },
  { code: "UEC2722", name: "Neural Networks and Pattern Recognition", semester: 7, department: "ECE", elective: "" },

  // BME
  { code: "UBM2726", name: "Bio MEMS", semester: 7, department: "BME", elective: "" },
  { code: "UBM2901", name: "Rehabilitation Engineering", semester: 7, department: "BME", elective: "" },
  { code: "UBM2702", name: "Therapeutic Equipment", semester: 7, department: "BME", elective: "" },
  { code: "UBM2722", name: "Soft Computing and Optimization Techniques", semester: 7, department: "BME", elective: "" },
  { code: "UBM2735", name: "Medical Device Safety and Quality Assurance", semester: 7, department: "BME", elective: "" },

  // CSE
  { code: "UCS2701", name: "Distributed Network and Security", semester: 7, department: "CSE", elective: "" },
  { code: "UCS2703", name: "Software Engineering", semester: 7, department: "CSE", elective: "" },
  { code: "UCS2722", name: "Object Oriented Analysis and Design", semester: 7, department: "CSE", elective: "" },
  { code: "UCS2727", name: "User Experience Design", semester: 7, department: "CSE", elective: "" },
  { code: "UCS2754", name: "Agile Methodologies", semester: 7, department: "CSE", elective: "" },
  { code: "UCS2702", name: "Compiler Design", semester: 7, department: "CSE", elective: "", tcp: "yes" },

  // IT
  { code: "UIT2701", name: "Network and Security", semester: 7, department: "IT", elective: "" },
  { code: "UIT2703", name: "Distributed Systems and Architecture", semester: 7, department: "IT", elective: "" },
  { code: "UIT2721", name: "Deep Learning Concepts and Architectures", semester: 7, department: "IT", elective: "" },
  { code: "UIT2729", name: "Image Processing and Computer Vision", semester: 7, department: "IT", elective: "", tcp: "yes" },
  { code: "UIT2739", name: "Full Stack Development", semester: 7, department: "IT", elective: "" },
  { code: "UIT2724", name: "Introduction to Blockchain Technology", semester: 7, department: "IT", elective: "" },
];

// ── SEMESTER VIII (Page 8) — Per-department subjects ────────────────
const sem8 = [
  // Civil
  { code: "UCE2821", name: "Prefabricated Structures", semester: 8, department: "CIVIL", elective: "" },

  // Mechanical
  { code: "UME2828", name: "Engineering Economics", semester: 8, department: "MECH", elective: "" },

  // Chemical
  { code: "UCH2826", name: "Energy Technology", semester: 8, department: "CHEM", elective: "" },

  // EEE
  { code: "UEE2821", name: "Electric Vehicles and Power Management", semester: 8, department: "EEE", elective: "" },

  // ECE
  { code: "UEC2821", name: "Cognitive Radio", semester: 8, department: "ECE", elective: "" },

  // BME
  { code: "UBM2825", name: "Disaster Science and Management", semester: 8, department: "BME", elective: "" },

  // CSE
  { code: "UCS2824", name: "Information Retrieval Techniques", semester: 8, department: "CSE", elective: "" },

  // IT
  { code: "UIT2824", name: "Human Computer Interaction", semester: 8, department: "IT", elective: "" },

  // 06.04.2026 Monday FN — Elective choices per department (row 2)
  { code: "UBA2044", name: "Innovation and Creativity", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_core_elective" },
  { code: "UEN2044", name: "Creative Writing", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_core_elective" },
  { code: "UME2045", name: "Project Management and Planning", semester: 8, department: "MECH", elective: "yes", electiveGroupId: "SEM8_core_elective" },
  { code: "UCE2048", name: "Disaster Management", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_core_elective" },
  { code: "UME2H26", name: "Computer Aided Inspection", semester: 8, department: "MECH", elective: "yes", electiveGroupId: "SEM8_core_elective" },

  // S Hours (listed below timetable)
  { code: "UCE2046", name: "Air Pollution and Control Engineering", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UCI2044", name: "Environmental Geo-technology", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_honours" },

  // Open Elective (listed at bottom of page)
  { code: "UBA2043", name: "Entrepreneurship", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UCE2045", name: "Green Building Design", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UCE2044", name: "Problem Solving and Programming in C++", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UCE2049", name: "Introduction to Internet of Things", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UCE2050", name: "Introduction to Semiconductors and Actuators", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UMA2041", name: "Graph Theory and its Applications", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UPH2049", name: "Nuclear Radiation Hazards and Safety Standards", semester: 8, department: "ECE", elective: "yes", electiveGroupId: "SEM8_open_elective" },
  { code: "UCE2044", name: "Environmental Impact Assessment", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_open_elective" },

  // Honours / Minors (listed at bottom of page)
  { code: "UCS2022", name: "Sustainability in Civil Engineering", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UCE2014", name: "Advanced Reinforced Concrete Designs", semester: 8, department: "CIVIL", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UME2023", name: "Machine Vision", semester: 8, department: "MECH", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UEE2039", name: "Bio-Energy Technology", semester: 8, department: "EEE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UEE2037", name: "Modelling of Electric Vehicle Power Train", semester: 8, department: "EEE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UEE2034", name: "Charging Systems for EV", semester: 8, department: "EEE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UEC2803", name: "Sensors, Actuators and Interfaces", semester: 8, department: "ECE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UEC2022", name: "IoT Communication Technologies", semester: 8, department: "ECE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UCS2036", name: "Computer Vision", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UCS2032", name: "Business Intelligence", semester: 8, department: "CSE", elective: "yes", electiveGroupId: "SEM8_honours" },
  { code: "UIT2722", name: "Data Visualization", semester: 8, department: "IT", elective: "yes", electiveGroupId: "SEM8_honours" },
];

// ── Deduplicate by code (keep first occurrence) ─────────────────────
function dedup(arr) {
  const seen = new Set();
  return arr.filter((s) => {
    if (seen.has(s.code)) return false;
    seen.add(s.code);
    return true;
  });
}

const allSubjects = dedup([...sem1, ...sem2, ...sem3, ...sem4, ...sem5, ...sem6, ...sem7, ...sem8]);

// ── Write XLSX files ────────────────────────────────────────────────
const header = ["code", "name", "semester", "department", "elective", "electiveGroupId", "tcp"];

function withElectiveGroups(data) {
  return data.map((row) => {
    const isElective = String(row.elective ?? "").trim().toLowerCase() === "yes";
    const existingGroup = String(row.electiveGroupId ?? "").trim();
    const tcp = String(row.tcp ?? "").trim();
    if (!isElective) {
      return { ...row, electiveGroupId: "", tcp };
    }
    if (existingGroup) {
      return { ...row, electiveGroupId: existingGroup, tcp };
    }
    // Fallback grouping for any elective row without explicit group mapping.
    return { ...row, electiveGroupId: `SEM${row.semester}_core_elective`, tcp };
  });
}

function writeXlsx(data, filePath) {
  const normalized = withElectiveGroups(data);
  const ws = XLSX.utils.json_to_sheet(normalized, { header });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Subjects");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  writeFileSync(filePath, buf);
  console.log(`Written: ${filePath} (${data.length} rows)`);
}

writeXlsx(sem1, "test-data/subjects-sem1.xlsx");
writeXlsx(sem2, "test-data/subjects-sem2.xlsx");
writeXlsx(dedup(sem3), "test-data/subjects-sem3.xlsx");
writeXlsx(dedup(sem4), "test-data/subjects-sem4.xlsx");
writeXlsx(dedup(sem5), "test-data/subjects-sem5.xlsx");
writeXlsx(dedup(sem6), "test-data/subjects-sem6.xlsx");
writeXlsx(dedup(sem7), "test-data/subjects-sem7.xlsx");
writeXlsx(dedup(sem8), "test-data/subjects-sem8.xlsx");
writeXlsx(allSubjects, "test-data/subjects-all.xlsx");

console.log(`\nTotal unique subjects: ${allSubjects.length}`);
