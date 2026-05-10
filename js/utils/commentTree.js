export function buildCommentTree(comments, sortOrder = "newest") {
  const byId = new Map();
  const roots = [];

  comments.forEach((comment) => {
    byId.set(comment.id, {
      ...comment,
      children: []
    });
  });

  byId.forEach((commentNode) => {
    if (commentNode.parentId && byId.has(commentNode.parentId)) {
      byId.get(commentNode.parentId).children.push(commentNode);
    } else {
      roots.push(commentNode);
    }
  });

  return sortCommentNodes(roots, sortOrder);
}

function sortByCreatedAtAsc(a, b) {
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function sortByCreatedAtDesc(a, b) {
  return new Date(b.createdAt) - new Date(a.createdAt);
}

function sortCommentNodes(nodes, sortOrder) {
  nodes.sort(sortOrder === "newest" ? sortByCreatedAtDesc : sortByCreatedAtAsc);
  nodes.forEach((node) => {
    sortCommentNodes(node.children, sortOrder);
  });

  return nodes;
}
