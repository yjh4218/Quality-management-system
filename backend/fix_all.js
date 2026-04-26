const fs = require('fs');
let data = fs.readFileSync('h2_migration_data.json', 'utf8');

const keysToFix = [
  'parent', 'master', 'planningSet', 'deleted', 'multiLayer', 
  'disclosed', 'passed', 'systemRole'
];

keysToFix.forEach(key => {
  const isKey = 'is' + key.charAt(0).toUpperCase() + key.slice(1);
  const regex = new RegExp(`"${key}" :`, 'g');
  data = data.replace(regex, `"${isKey}" :`);
});

fs.writeFileSync('h2_migration_data.json', data, 'utf8');
