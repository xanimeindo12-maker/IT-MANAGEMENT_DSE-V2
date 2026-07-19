const fs = require('fs');
const path = require('path');

let indexHtml = fs.readFileSync('Index.html', 'utf8');

// 1. Fix CSS path
indexHtml = indexHtml.replace(/href="css\/style.css"/ig, 'href="css/style.css"');

// 2. Add api.js script and fix JS path
indexHtml = indexHtml.replace(/<script src="js\/app\.js"><\/script>/ig, '<script src="js/api.js"></script>\n  <script src="js/app.js"></script>');

// 3. Replace placeholders with actual HTML file content
const injectFiles = [
  { placeholder: '<!-- Content from PA_Analytics.html is embedded here -->', file: 'PA_Analytics.html', process: (content) => content.replace('id="paTrendChart"', 'id="paTrendChartPA"') },
  { placeholder: '<!-- Content from Maintenance_Plan.html is embedded here -->', file: 'Maintenance_Plan.html' },
  { placeholder: '<!-- Content from Evidence_Report.html is embedded here -->', file: 'Evidence_Report.html' },
  { placeholder: '<!-- Content from Part_Accessories.html is embedded here -->', file: 'Part_Accessories.html' },
  { placeholder: '<!-- Content from Asset_Loans.html is embedded here -->', file: 'Asset_Loans.html' },
];

for (const item of injectFiles) {
  if (indexHtml.includes(item.placeholder)) {
    let content = fs.readFileSync(item.file, 'utf8');
    if (item.process) {
      content = item.process(content);
    }
    indexHtml = indexHtml.replace(item.placeholder, content);
    console.log(`Injected ${item.file}`);
  } else {
    console.log(`Placeholder for ${item.file} not found in Index.html!`);
  }
}

fs.writeFileSync('Index.html', indexHtml);
console.log('Successfully updated Index.html');
