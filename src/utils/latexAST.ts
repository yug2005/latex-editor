// @ts-nocheck
import { latexParser } from "latex-utensils";

export type SectionNode = {
  kind: "section" | "subsection" | "subsubsection";
  name?: string;
  args: (latexParser.OptionalArg | latexParser.Group)[];
  content: LatexNode[];
  location: latexParser.Location;
  command: latexParser.Command;
};

export type AnyNode = latexParser.Node | SectionNode;
export type LatexNode = AnyNode & { parent?: LatexNode };

const addParentReferences = (node: LatexNode, parent: LatexNode | null) => {
  if (!node) return;
  node.parent = parent;

  if ("args" in node && Array.isArray(node.args)) {
    node.args.forEach((arg) => {
      addParentReferences(arg as LatexNode, node);
    });
  }

  if ("content" in node && Array.isArray(node.content)) {
    node.content.forEach((child) => {
      addParentReferences(child as LatexNode, node);
    });
  }
};

const restructureNodes = (nodes: AnyNode[]) => {
  let result: AnyNode[] = [];

  // split the nodes into sections:
  let currentSection: SectionNode | null = null;
  let currentSubsection: SectionNode | null = null;
  let currentSubsubsection: SectionNode | null = null;

  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.kind === "command") {
      if (node.name === "section") {
        if (currentSection && currentSubsection && currentSubsubsection) {
          currentSubsection.content.push(currentSubsubsection);
        }
        if (currentSection && currentSubsection) {
          currentSection.content.push(currentSubsection);
        }
        if (currentSection) {
          result.push(currentSection);
        }
        currentSubsubsection = null;
        currentSubsection = null;
        currentSection = {
          kind: "section",
          args: node.args,
          content: [],
          location: node.location,
          command: node,
        };
      } else if (node.name === "subsection") {
        if (currentSection && currentSubsection && currentSubsubsection) {
          currentSubsection.content.push(currentSubsubsection);
        }
        if (currentSection && currentSubsection) {
          currentSection.content.push(currentSubsection);
        }
        currentSubsubsection = null;
        currentSubsection = {
          kind: "subsection",
          args: node.args,
          content: [],
          location: node.location,
          command: node,
        };
      } else if (node.name === "subsubsection") {
        if (currentSection && currentSubsection && currentSubsubsection) {
          currentSubsection.content.push(currentSubsubsection);
        }
        currentSubsubsection = {
          kind: "subsubsection",
          args: node.args,
          content: [],
          location: node.location,
          command: node,
        };
      } else {
        if (currentSubsubsection) {
          currentSubsubsection.content.push(node);
        } else if (currentSubsection) {
          currentSubsection.content.push(node);
        } else if (currentSection) {
          currentSection.content.push(node);
        } else {
          result.push(node);
        }
      }
    } else {
      if ("content" in node && Array.isArray(node.content)) {
        node.content = restructureNodes(node.content);
      }
      if (currentSubsubsection) {
        currentSubsubsection.content.push(node);
      } else if (currentSubsection) {
        currentSubsection.content.push(node);
      } else if (currentSection) {
        currentSection.content.push(node);
      } else {
        result.push(node);
      }
    }
  }

  if (currentSection && currentSubsection && currentSubsubsection) {
    currentSubsubsection.content.push(node);
  }
  if (currentSection && currentSubsection) {
    currentSection.content.push(currentSubsection);
  }
  if (currentSection) {
    result.push(currentSection);
  }

  return result;
};

const updateSectionLocations = (nodes: AnyNode[]) => {
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if ("content" in node && Array.isArray(node.content)) {
      updateSectionLocations(node.content);
    }
    if (
      node.kind === "section" ||
      node.kind === "subsection" ||
      node.kind === "subsubsection"
    ) {
      if (
        "content" in node &&
        Array.isArray(node.content) &&
        node.content.length > 0
      ) {
        let firstNode = node.content.find((child) => "location" in child);
        let lastNode = node.content.findLast((child) => "location" in child);
        if (firstNode && lastNode && firstNode.location && lastNode.location) {
          let start = firstNode.location.start;
          let end = lastNode.location.end;
          node.location = {
            start,
            end,
          };
        }
      }
    }
  }
};

export const parseLatex = (content: string) => {
  const AST = latexParser.parse(content, {
    startRule: "Root",
    enableComment: true,
  });
  AST.content = restructureNodes(AST.content);
  updateSectionLocations(AST.content);
  AST.content.forEach((node) => {
    addParentReferences(node, null);
  });
  return AST;
};
