const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
};

// Common Lucide icons are strictly CamelCase and usually relatively short words
// We can check against a known list if we had one, but we can also just check usage vs imports
const findMissingLucideIcons = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('lucide-react')) return null;

  const importMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/s);
  if (!importMatch) return null;

  const importedIcons = importMatch[1]
    .replace(/\n/g, ' ')
    .split(',')
    .map(i => i.split('as')[0].trim())
    .filter(Boolean);
  
  // Find all <IconName usage
  const componentRegex = /<([A-Z][a-zA-Z0-9]+)/g;
  const usedComponents = new Set();
  let match;
  while ((match = componentRegex.exec(content)) !== null) {
      usedComponents.add(match[1]);
  }

  // Find all {IconName usage (for dynamic components or icons as props)
  const propRegex = /[:={]\s*([A-Z][a-zA-Z0-9]+)/g;
  while ((match = propRegex.exec(content)) !== null) {
      usedComponents.add(match[1]);
  }

  const ignore = new Set([
      'Link', 'Button', 'Badge', 'Label', 'Input', 'Textarea', 'Select', 'Tabs', 'Card', 'Table',
      'Dialog', 'Dropdown', 'Scroll', 'Popover', 'Command', 'Sheet', 'Tooltip', 'Switch', 'Checkbox', 
      'Radio', 'Slider', 'Progress', 'Accordion', 'Calendar', 'Separator', 'Avatar', 'Skeleton',
      'Form', 'FormControl', 'FormField', 'FormItem', 'FormLabel', 'FormMessage',
      'React', 'Fragment', 'Suspense', 'Portal', 'Image', 'NextLink', 'NextImage', 'Head',
      'Html', 'Body', 'Main', 'NextScript'
  ]);

  const missing = [];
  for (const component of usedComponents) {
      // Very crude heuristic: if it's imported from lucide-react, it's an icon.
      // If it's NOT imported and NOT in ignore and NOT imported from elsewhere...
      if (!importedIcons.includes(component)) {
          // Check if it's likely a Lucide icon (CamelCase, not starting with React prefixes)
          const isLikelyIcon = /^[A-Z][a-z]+[A-Z0-9]/.test(component) || (component.length > 3 && component === component.toUpperCase() === false);
          
          if (isLikelyIcon && !ignore.has(component)) {
              // Check if it's imported from anywhere else in the file
              const isImportedElsewhere = new RegExp(`import\\s*.*${component}.*\\s*from`).test(content);
              const isDefinedLocally = new RegExp(`(const|let|var|function|class|interface|type)\\s+${component}\\b`).test(content);
              
              if (!isImportedElsewhere && !isDefinedLocally) {
                  missing.push(component);
              }
          }
      }
  }

  return missing.length > 0 ? { file: filePath, missing } : null;
};

const files = walk('src');
const allMissing = files.map(findMissingLucideIcons).filter(Boolean);

console.log(JSON.stringify(allMissing, null, 2));
