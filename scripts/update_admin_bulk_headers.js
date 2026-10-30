const fs = require('fs');

const tsPath = 'src/app/features/admin/pages/admin-dashboard/admin-dashboard.component.ts';
let ts = fs.readFileSync(tsPath, 'utf8');

// 1. Define Canonical Headers & Schema
const canonicalHeadersBlock = `
export const CANONICAL_BULK_HEADERS = [
  'Property ID',
  'Developer',
  'Project Name',
  'RERA Number',
  'DTCP Approved',
  'DTCP / LP Approval No.',
  'Patta Type',
  'Clear Title / EC Available',
  'Bank Loan Approved',
  'Area / Location',
  'Village / Locality',
  'Taluk',
  'District',
  'Pincode',
  'Google Maps Link',
  'Plot No.',
  'Plot Size (sq.ft)',
  'Facing',
  'Corner Plot',
  'Land Use',
  'Price per sq.ft (₹)',
  'Total Price (₹)',
  'Availability',
  'Petrol Bunk Distance (km)',
  'Schools (Name & km)',
  'Colleges (Name & km)',
  'Hospital (Name & km)',
  'Corridor',
  'Bus Stop Distance (km)',
  'Railway Station (Name & km)',
  'Highway Name',
  'Highway Access Distance (km)',
  'Airport Distance (km)',
  'Suited For',
  'Possession Timeline',
  'Electricity',
  'Water Connection',
  'Drainage Facility',
  'Road Width (ft)',
  'Road Type',
  'Street Lights',
  'Compound Wall / Gated',
  'Park',
  'Other Amenities',
  'Developer Maintenance after Handover (yrs)',
  'Flood Zone',
  'Waterlogging History',
  'Contact Person / Phone',
  'Remarks'
] as const;
`;

if (!ts.includes('CANONICAL_BULK_HEADERS')) {
  ts = canonicalHeadersBlock + '\n' + ts;
}

// 2. Update downloadExcelTemplate
const oldDownloadTmpl = `  downloadExcelTemplate(): void {
    const templateHeaders = [
      'Property ID', 'Project Name', 'Developer', 'RERA Number', 'DTCP Approved',
      'DTCP Approval No', 'Patta Type', 'Clear Title Available', 'Bank Loan Approved',
      'Area / Location', 'Village / Locality', 'Taluk', 'District', 'Pincode',
      'Google Maps Link', 'Plot No', 'Plot Size (Sq.ft)', 'Plot Size (Cents)',
      'Dimension', 'Facing', 'Corner Plot', 'Land Use', 'Price per Sq.ft',
      'Total Price', 'Availability', 'Petrol Bunk Distance (km)', 'Schools Nearby',
      'Colleges Nearby', 'Hospital Nearby', 'Corridor', 'Bus Stop Distance (km)',
      'Railway Station Nearby', 'Highway Name', 'Highway Distance (km)', 'Airport Distance (km)',
      'Suited For', 'Possession Timeline', 'Electricity', 'Water Connection',
      'Drainage Facility', 'Road Width (ft)', 'Road Type', 'Street Lights',
      'Compound Wall / Gated', 'Park', 'Other Amenities', 'Developer Maintenance (Years)',
      'Flood Zone', 'Waterlogging History', 'Contact Person Phone', 'Remarks'
    ];

    const sampleRow1 = [
      'PRJ-1001', 'Greenfield Royal Palms', 'Greenfield Housing Ltd', 'TN/01/Layout/1234/2026', 'Yes',
      'DTCP/LP/89/2026', 'Individual Patta', 'Yes', 'Yes',
      'Guduvanchery', 'Nandivaram', 'Vandalur', 'Chengalpattu', '603202',
      'https://www.google.com/maps?q=12.8436,80.0601', '12', 1200, 2.75,
      '30 x 40', 'East', 'No', 'Residential', 3200,
      3840000, 'Available', 1.2, 'SSM School (1.5 km)',
      'SRM University (6 km)', 'SRM Global Hospital (6 km)', 'GST Road', 0.8,
      'Guduvanchery Railway Station (2.5 km)', 'GST Road (NH 45)', 2.0, 28.0,
      'Immediate Possession', 'Immediate', 'Available', 'Available',
      'Underground', 30, 'Tar Road', 'Yes',
      'Yes', 'Yes', 'Clubhouse, Solar Street Lights, Avenue Trees', 2,
      'No', 'No', '+91 94441 00000', 'Clear patta freehold land ready for immediate registration'
    ];

    // Sample row with invalid GPS to demonstrate red highlight verification
    const sampleRow2 = [
      'PRJ-1002', 'Serene Emerald Enclave', 'Prestige Developers', 'TN/01/Layout/1235/2026', 'Yes',
      'DTCP/LP/90/2026', 'Individual Patta', 'Yes', 'Yes',
      'Kelambakkam', 'Kelambakkam Town', 'Thiruporur', 'Chengalpattu', '603103',
      'PENDING_GPS_AUDIT', '24', 1500, 3.44,
      '30 x 50', 'North', 'Yes', 'Residential', 3500,
      5250000, 'Available', 0.8, 'Hiranandani Upscale School (4 km)',
      'Chettinad Medical College (2 km)', 'Chettinad Super Speciality (2 km)', 'OMR', 0.4,
      'Vandalur Railway Station (14 km)', 'Old Mahabalipuram Road (SH 49A)', 0.5, 32.0,
      'Immediate Possession', 'Immediate', 'Available', 'Available',
      'Underground', 40, 'Tar Road', 'Yes',
      'Yes', 'Yes', '24x7 Security, Blacktop Roads, Compound Wall', 3,
      'No', 'No', '+91 94441 11111', 'Corner plot with dual road access. GPS coordinates pending survey audit (flags in red).'
    ];

    const wsData = [templateHeaders, sampleRow1, sampleRow2];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    ws['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length + 3, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Property Master Template');

    XLSX.writeFile(wb, 'Property_Master_Data_Bulk_Template.xlsx');

    this.notificationService.show({
      type: 'info',
      title: 'Template Downloaded',
      message: 'Property Master Bulk Upload template downloaded with 51 canonical fields.',
      icon: 'download'
    });
  }`;

const newDownloadTmpl = `  downloadExcelTemplate(): void {
    const templateHeaders = [...CANONICAL_BULK_HEADERS];

    const sampleRow1 = [
      'PRJ-1001',                                       // Property ID
      'Greenfield Housing Ltd',                         // Developer
      'Greenfield Royal Palms',                         // Project Name
      'TN/01/Layout/1234/2026',                         // RERA Number
      'Yes',                                            // DTCP Approved
      'DTCP/LP/89/2026',                                // DTCP / LP Approval No.
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes',                                            // Bank Loan Approved
      'Guduvanchery',                                   // Area / Location
      'Nandivaram',                                     // Village / Locality
      'Vandalur',                                       // Taluk
      'Chengalpattu',                                   // District
      '603202',                                         // Pincode
      'https://www.google.com/maps?q=12.8436,80.0601',   // Google Maps Link
      '12',                                             // Plot No.
      1200,                                             // Plot Size (sq.ft)
      'East',                                           // Facing
      'No',                                             // Corner Plot
      'Residential',                                    // Land Use
      3200,                                             // Price per sq.ft (₹)
      3840000,                                          // Total Price (₹)
      'Available',                                      // Availability
      1.2,                                              // Petrol Bunk Distance (km)
      'SSM School (1.5 km)',                            // Schools (Name & km)
      'SRM University (6 km)',                          // Colleges (Name & km)
      'SRM Global Hospital (6 km)',                     // Hospital (Name & km)
      'GST Road',                                       // Corridor
      0.8,                                              // Bus Stop Distance (km)
      'Guduvanchery Railway Station (2.5 km)',          // Railway Station (Name & km)
      'GST Road (NH 45)',                               // Highway Name
      2.0,                                              // Highway Access Distance (km)
      28.0,                                             // Airport Distance (km)
      'Both',                                           // Suited For
      'Immediate',                                      // Possession Timeline
      'Available',                                      // Electricity
      'Available',                                      // Water Connection
      'Underground',                                    // Drainage Facility
      30,                                               // Road Width (ft)
      'Tar Road',                                       // Road Type
      'Yes',                                            // Street Lights
      'Yes',                                            // Compound Wall / Gated
      'Yes',                                            // Park
      'Clubhouse, Solar Street Lights, Avenue Trees',   // Other Amenities
      2,                                                // Developer Maintenance after Handover (yrs)
      'No',                                             // Flood Zone
      'No',                                             // Waterlogging History
      '+91 94441 00000',                                // Contact Person / Phone
      'Clear patta freehold land ready for immediate registration' // Remarks
    ];

    const sampleRow2 = [
      'PRJ-1002',                                       // Property ID
      'Prestige Developers',                            // Developer
      'Serene Emerald Enclave',                         // Project Name
      'TN/01/Layout/1235/2026',                         // RERA Number
      'Yes',                                            // DTCP Approved
      'DTCP/LP/90/2026',                                // DTCP / LP Approval No.
      'Individual Patta',                               // Patta Type
      'Yes',                                            // Clear Title / EC Available
      'Yes',                                            // Bank Loan Approved
      'Kelambakkam',                                    // Area / Location
      'Kelambakkam Town',                               // Village / Locality
      'Thiruporur',                                     // Taluk
      'Chengalpattu',                                   // District
      '603103',                                         // Pincode
      '12.7845, 80.2223',                               // Google Maps Link
      '24',                                             // Plot No.
      1500,                                             // Plot Size (sq.ft)
      'North',                                          // Facing
      'Yes',                                            // Corner Plot
      'Residential',                                    // Land Use
      3500,                                             // Price per sq.ft (₹)
      5250000,                                          // Total Price (₹)
      'Available',                                      // Availability
      0.8,                                              // Petrol Bunk Distance (km)
      'Hiranandani Upscale School (4 km)',              // Schools (Name & km)
      'Chettinad Medical College (2 km)',               // Colleges (Name & km)
      'Chettinad Super Speciality (2 km)',              // Hospital (Name & km)
      'OMR',                                            // Corridor
      0.4,                                              // Bus Stop Distance (km)
      'Vandalur Railway Station (14 km)',               // Railway Station (Name & km)
      'Old Mahabalipuram Road (SH 49A)',                // Highway Name
      0.5,                                              // Highway Access Distance (km)
      32.0,                                             // Airport Distance (km)
      'Both',                                           // Suited For
      'Immediate',                                      // Possession Timeline
      'Available',                                      // Electricity
      'Available',                                      // Water Connection
      'Underground',                                    // Drainage Facility
      40,                                               // Road Width (ft)
      'Tar Road',                                       // Road Type
      'Yes',                                            // Street Lights
      'Yes',                                            // Compound Wall / Gated
      'Yes',                                            // Park
      '24x7 Security, Blacktop Roads, Compound Wall',   // Other Amenities
      3,                                                // Developer Maintenance after Handover (yrs)
      'No',                                             // Flood Zone
      'No',                                             // Waterlogging History
      '+91 94441 11111',                                // Contact Person / Phone
      'Corner plot with dual road access and DTCP sanction.' // Remarks
    ];

    const wsData = [templateHeaders, sampleRow1, sampleRow2];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    ws['!cols'] = templateHeaders.map(h => ({ wch: Math.max(h.length + 3, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Property Master Template');

    XLSX.writeFile(wb, 'Property_Master_Data_Bulk_Template.xlsx');

    this.notificationService.show({
      type: 'info',
      title: 'Template Downloaded',
      message: 'Property Master Bulk Upload template downloaded with the 49 canonical fields.',
      icon: 'download'
    });
  }`;

function replaceLoose(haystack, needle, replacement) {
  const normHaystack = haystack.replace(/\\r\\n/g, '\\n');
  const normNeedle = needle.replace(/\\r\\n/g, '\\n');
  const normRep = replacement.replace(/\\r\\n/g, '\\n');
  if (normHaystack.includes(normNeedle)) {
    const updated = normHaystack.replace(normNeedle, normRep);
    return haystack.includes('\\r\\n') ? updated.replace(/\\n/g, '\\r\\n') : updated;
  }
  return null;
}

let updatedTs = replaceLoose(ts, oldDownloadTmpl, newDownloadTmpl);
if (updatedTs) {
  ts = updatedTs;
  console.log('Updated downloadExcelTemplate successfully');
} else {
  console.error('Failed to update downloadExcelTemplate');
}

fs.writeFileSync(tsPath, ts, 'utf8');
console.log('Saved admin-dashboard.component.ts');

