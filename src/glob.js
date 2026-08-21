'use strict';

import fs from 'fs';
import path from 'path';

function segmentToRegExp(segment) 
{
  let pattern = '';
  for (const ch of segment) 
  {
    if (ch === '*') 
    {
      pattern += '[^/]*';
    }
    else if (ch === '?') 
    {
      pattern += '[^/]';
    }
    else 
    {
      pattern += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${pattern}$`);
}

/**
 * Small synchronous glob supporting `*`, `?`, and `**` across path
 * segments. Good enough for lint file patterns (e.g. `src/**\/*.gml`)
 * without pulling in a dependency.
 * @param pattern
 * @param cwd
 */
function globSync(pattern, cwd = process.cwd()) 
{
  const isAbsolute = path.isAbsolute(pattern);
  const absolute = isAbsolute ? pattern : path.join(cwd, pattern);
  const root = isAbsolute ? path.parse(absolute).root : cwd;
  const relative = path.relative(root, absolute);
  const segments = relative.split(path.sep).filter(Boolean);

  let matches = [root];
  for (let idx = 0; idx < segments.length; idx++) 
  {
    const segment = segments[idx];
    const isLast = idx === segments.length - 1;
    const next = [];

    if (segment === '**') 
    {
      for (const base of matches) 
      {
        if (!isLast) 
        {
          next.push(base);
        } // '**/x' can match zero directories too
        collectRecursive(base, isLast, next);
      }
      matches = next;
      continue;
    }

    const regex = segmentToRegExp(segment);
    for (const base of matches) 
    {
      let entries;
      try 
      {
        entries = fs.readdirSync(base, { withFileTypes: true });
      }
      catch 
      {
        continue;
      }
      for (const entry of entries) 
      {
        if (!regex.test(entry.name)) 
        {
          continue;
        }
        const full = path.join(base, entry.name);
        if (isLast) 
        {
          if (entry.isFile()) 
          {
            next.push(full);
          }
        }
        else if (entry.isDirectory()) 
        {
          next.push(full);
        }
      }
    }
    matches = next;
  }
  return matches.sort();
}

function collectRecursive(base, wantFiles, out) 
{
  let entries;
  try 
  {
    entries = fs.readdirSync(base, { withFileTypes: true });
  }
  catch 
  {
    return;
  }
  for (const entry of entries) 
  {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) 
    {
      if (!wantFiles) 
      {
        out.push(full);
      }
      collectRecursive(full, wantFiles, out);
    }
    else if (wantFiles) 
    {
      out.push(full);
    }
  }
}

export { globSync };