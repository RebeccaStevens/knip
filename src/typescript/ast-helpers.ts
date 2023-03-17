import ts from 'typescript';

interface ValidImportTypeNode extends ts.ImportTypeNode {
  argument: ts.LiteralTypeNode & { literal: ts.StringLiteral };
}

export function isValidImportTypeNode(node: ts.Node): node is ValidImportTypeNode {
  return ts.isImportTypeNode(node);
}

export function isPrivateMember(node: ts.MethodDeclaration | ts.PropertyDeclaration): boolean {
  return node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword) ?? false;
}

export function isDefaultImport(
  node: ts.ImportDeclaration | ts.ImportEqualsDeclaration | ts.ExportDeclaration
): boolean {
  return node.kind === ts.SyntaxKind.ImportDeclaration && !!node.importClause && !!node.importClause.name;
}

export function isVariableDeclarationList(node: ts.Node): node is ts.VariableDeclarationList {
  return node.kind === ts.SyntaxKind.VariableDeclarationList;
}

export function isAccessExpression(node: ts.Node): node is ts.PropertyAccessExpression | ts.ElementAccessExpression {
  return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node);
}

export function isImportCall(node: ts.Node): node is ts.ImportCall {
  return (
    node.kind === ts.SyntaxKind.CallExpression &&
    (node as ts.CallExpression).expression.kind === ts.SyntaxKind.ImportKeyword
  );
}

export function isRequireCall(callExpression: ts.Node): callExpression is ts.CallExpression {
  if (callExpression.kind !== ts.SyntaxKind.CallExpression) {
    return false;
  }
  const { expression, arguments: args } = callExpression as ts.CallExpression;

  if (expression.kind !== ts.SyntaxKind.Identifier || (expression as ts.Identifier).escapedText !== 'require') {
    return false;
  }

  return args.length === 1;
}

export function isRequireResolveCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.getText() === 'require.resolve'
  );
}

export function getAccessExpressionName(node: ts.PropertyAccessExpression | ts.ElementAccessExpression) {
  return 'argumentExpression' in node ? stripQuotes(node.argumentExpression.getText()) : node.name.getText();
}

type LiteralLikeElementAccessExpression = ts.ElementAccessExpression &
  ts.Declaration & {
    readonly argumentExpression: ts.StringLiteralLike | ts.NumericLiteral;
  };

export function isModuleExportsAccessExpression(
  node: ts.Node
): node is LiteralLikeElementAccessExpression & { expression: ts.Identifier } {
  return (
    (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
    ts.isIdentifier(node.expression) &&
    node.expression.escapedText === 'module' &&
    getAccessExpressionName(node) === 'exports'
  );
}

export function stripQuotes(name: string) {
  const length = name.length;
  if (length >= 2 && name.charCodeAt(0) === name.charCodeAt(length - 1) && isQuoteOrBacktick(name.charCodeAt(0))) {
    return name.substring(1, length - 1);
  }
  return name;
}

const enum CharacterCodes {
  backtick = 0x60,
  doubleQuote = 0x22,
  singleQuote = 0x27,
}

function isQuoteOrBacktick(charCode: number) {
  return (
    charCode === CharacterCodes.singleQuote ||
    charCode === CharacterCodes.doubleQuote ||
    charCode === CharacterCodes.backtick
  );
}

export function findAncestor<T>(
  node: ts.Node | undefined,
  callback: (element: ts.Node) => boolean | 'STOP'
): T | undefined {
  node = node?.parent;
  while (node) {
    const result = callback(node);
    if (result === 'STOP') {
      return undefined;
    } else if (result) {
      return node as T;
    }
    node = node.parent;
  }
  return undefined;
}

export function findDescendants<T>(node: ts.Node | undefined, callback: (element: ts.Node) => boolean | 'STOP'): T[] {
  const results: T[] = [];

  if (!node) return results;

  function visit(node: ts.Node) {
    const result = callback(node);
    if (result === 'STOP') {
      return;
    } else if (result) {
      results.push(node as T);
    }
    ts.forEachChild(node, visit);
  }

  visit(node);

  return results;
}

export const isDeclarationFileExtension = (extension: string) =>
  extension === '.d.ts' || extension === '.d.mts' || extension === '.d.cts';
