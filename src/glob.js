'use strict';

import fs from 'fs';
import path from 'path';

/**
 * Converts a glob segment pattern into a regular expression.
 * @param {string} segment - The glob path segment to convert.
 * @returns {RegExp} The corresponding regular expression.
 */
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
 * segments. Good enough for lint file patterns (e.g. `src/&#42;&#42;/&#42;.gml`)
 * without pulling in a dependency[cite: 3].
 * @param {string} pattern - The glob pattern to match files against.
 * @param {string} [cwd] - The current working directory to resolve relative paths from.
 * @returns {string[]} A sorted array of matched absolute file paths.
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

/**
 * Recursively collects matching files or directories under a base directory.
 * @param {string} base - The base directory path to search within.
 * @param {boolean} wantFiles - Flag indicating whether to collect files (true) or directories (false).
 * @param {string[]} out - The output array accumulating matched paths.
 * @returns {void}
 */
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