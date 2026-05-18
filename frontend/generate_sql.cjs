const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('../backend/sql/data.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet);

const defaultPasswordHash = '$2y$10$bpki/jrROvD7NOI5XI/I7OukvIE21XQrD5dJjdjV5XSWqH2TnS8Q2';

// Skip the first row as it contains headers like 'FACULTY NAME'
let sql = `INSERT INTO users (college_id, role_id, name, email, password_hash) VALUES\n`;
let values = [];

for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = row['__EMPTY'];
    const email = row['__EMPTY_2'];
    if (name && email) {
        // Escape quotes if any
        const safeName = name.replace(/'/g, "''");
        const safeEmail = email.replace(/'/g, "''");
        values.push(`(1, 3, '${safeName}', '${safeEmail}', '${defaultPasswordHash}')`);
    }
}

sql += values.join(',\n') + ';\n';

fs.writeFileSync('../backend/sql/seed_faculties.sql', sql);
console.log('SQL generated at backend/sql/seed_faculties.sql');
