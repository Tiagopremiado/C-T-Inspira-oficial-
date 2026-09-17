const fs = require('fs');
let code = fs.readFileSync('server/dataService.ts', 'utf8');

code = code.replace(/const \{ data: preList, error \} = await supabase/g, 
`console.log("Fetching from Supabase...");
const { data: preList, error } = await supabase`);

code = code.replace(/return preList\.map\(\(r: any\) => \{/g, 
`console.log("Supabase returned", preList ? preList.length : 0, "items");
return preList.map((r: any) => {`);

fs.writeFileSync('server/dataService.ts', code);
