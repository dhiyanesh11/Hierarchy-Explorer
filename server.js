const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USER_ID = "dhiya_24042004";
const EMAIL_ID = "dhiya@srm.edu";
const COLLEGE_ROLL = "RA2211003011000";

function validateEntry(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false };

  const parts = trimmed.split("->");
  if (parts.length !== 2) return { valid: false };

  const [parent, child] = parts;

  if (!/^[A-Z]$/.test(parent)) return { valid: false };
  if (!/^[A-Z]$/.test(child)) return { valid: false };
  if (parent === child) return { valid: false };

  return { valid: true, parent, child };
}

function findComponents(adjList, allNodes) {
  const visited = new Set();
  const components = [];

  const undirected = {};
  for (const node of allNodes) {
    undirected[node] = new Set();
  }
  for (const [parent, children] of Object.entries(adjList)) {
    for (const child of children) {
      undirected[parent].add(child);
      undirected[child].add(parent);
    }
  }

  for (const node of allNodes) {
    if (visited.has(node)) continue;
    const component = new Set();
    const stack = [node];
    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);
      for (const neighbor of (undirected[current] || [])) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
    components.push(component);
  }

  return components;
}

// DFS cycle detection using coloring: 0=white, 1=gray, 2=black
function hasCycle(componentNodes, adjList) {
  const color = {};
  for (const n of componentNodes) color[n] = 0;

  function dfs(node) {
    color[node] = 1;
    for (const neighbor of (adjList[node] || [])) {
      if (!componentNodes.has(neighbor)) continue;
      if (color[neighbor] === 1) return true;
      if (color[neighbor] === 0 && dfs(neighbor)) return true;
    }
    color[node] = 2;
    return false;
  }

  for (const n of componentNodes) {
    if (color[n] === 0 && dfs(n)) return true;
  }
  return false;
}

function buildTree(root, adjList) {
  const obj = {};
  const children = adjList[root] || [];
  const childObj = {};
  for (const child of children) {
    Object.assign(childObj, buildTree(child, adjList));
  }
  obj[root] = childObj;
  return obj;
}

function computeDepth(root, adjList) {
  const children = adjList[root] || [];
  if (children.length === 0) return 1;
  let maxChildDepth = 0;
  for (const child of children) {
    maxChildDepth = Math.max(maxChildDepth, computeDepth(child, adjList));
  }
  return 1 + maxChildDepth;
}

function processData(data) {
  const invalidEntries = [];
  const duplicateEdgesSet = new Set();
  const seenEdges = new Set();
  const validEdges = [];

  for (const raw of data) {
    const result = validateEntry(String(raw));
    if (!result.valid) {
      invalidEntries.push(String(raw).trim() || raw);
      continue;
    }
    const edgeKey = `${result.parent}->${result.child}`;
    if (seenEdges.has(edgeKey)) {
      duplicateEdgesSet.add(edgeKey);
      continue;
    }
    seenEdges.add(edgeKey);
    validEdges.push({ parent: result.parent, child: result.child });
  }

  // Keep only the first parent for each child (diamond/multi-parent resolution)
  const childParentMap = {};
  const effectiveEdges = [];
  for (const edge of validEdges) {
    if (childParentMap[edge.child] !== undefined) continue;
    childParentMap[edge.child] = edge.parent;
    effectiveEdges.push(edge);
  }

  const adjList = {};
  const allNodes = new Set();
  for (const edge of effectiveEdges) {
    if (!adjList[edge.parent]) adjList[edge.parent] = [];
    adjList[edge.parent].push(edge.child);
    allNodes.add(edge.parent);
    allNodes.add(edge.child);
  }

  const components = findComponents(adjList, allNodes);

  const childSet = new Set(Object.values(childParentMap).length ? Object.keys(childParentMap) : []);
  const hierarchies = [];

  for (const componentNodes of components) {
    const cycleDetected = hasCycle(componentNodes, adjList);

    let roots = [];
    for (const node of componentNodes) {
      if (!childSet.has(node)) roots.push(node);
    }

    let root;
    if (roots.length > 0) {
      roots.sort();
      root = roots[0];
    } else {
      const sorted = [...componentNodes].sort();
      root = sorted[0];
    }

    if (cycleDetected) {
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const tree = buildTree(root, adjList);
      const depth = computeDepth(root, adjList);
      hierarchies.push({ root, tree, depth });
    }
  }

  const treesOnly = hierarchies.filter((h) => !h.has_cycle);
  const totalTrees = treesOnly.length;
  const totalCycles = hierarchies.filter((h) => h.has_cycle).length;

  let largestTreeRoot = "";
  let maxDepth = 0;
  for (const t of treesOnly) {
    if (
      t.depth > maxDepth ||
      (t.depth === maxDepth && t.root < largestTreeRoot)
    ) {
      maxDepth = t.depth;
      largestTreeRoot = t.root;
    }
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: [...duplicateEdgesSet],
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

app.post("/bfhl", (req, res) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: "Invalid request: 'data' must be an array." });
    }
    const result = processData(data);
    return res.json(result);
  } catch (err) {
    console.error("Error processing /bfhl:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/bfhl", (_req, res) => {
  res.json({ operation_code: 1 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BFHL API running on http://localhost:${PORT}`);
});
