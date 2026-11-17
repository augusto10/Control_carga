import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const componentPath = resolve(__dirname, '../components/ListarControlesContent.tsx');
const componentText = readFileSync(componentPath, 'utf8');
const source = ts.createSourceFile(componentPath, componentText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const headerStyles: Array<{ label: string; sx: ts.ObjectLiteralExpression }> = [];

const property = (object: ts.ObjectLiteralExpression, name: string) => object.properties.find((entry) =>
  ts.isPropertyAssignment(entry) && entry.name.getText(source).replace(/['"]/g, '') === name
) as ts.PropertyAssignment | undefined;

const visit = (node: ts.Node, insideStickyTable = false, insideTableHead = false) => {
  const isStickyTable = insideStickyTable || (
    ts.isJsxElement(node)
    && node.openingElement.tagName.getText(source) === 'Table'
    && node.openingElement.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'stickyHeader'
    )
  );
  const isTableHead = insideTableHead || (
    isStickyTable && ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'TableHead'
  );
  if (isTableHead && ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'TableCell') {
    const sx = node.openingElement.attributes.properties.find((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'sx'
    ) as ts.JsxAttribute | undefined;
    const expression = sx?.initializer && ts.isJsxExpression(sx.initializer) ? sx.initializer.expression : undefined;
    if (expression && ts.isObjectLiteralExpression(expression)) {
      const label = node.children.find((child) => ts.isJsxText(child))?.getText(source).trim() || '';
      headerStyles.push({ label, sx: expression });
    }
  }
  ts.forEachChild(node, (child) => visit(child, isStickyTable, isTableHead));
};

visit(source);
assert.equal(headerStyles.length, 8, 'all control table columns should have a header cell');
assert.match(componentText, /<Table\s+stickyHeader/, 'the control table should scroll its rows beneath the header');
assert.match(componentText, /maxHeight: 'calc\(100vh - 400px\)'/, 'the controls table should have its own scroll area');
assert.match(componentText, /overflowY: 'auto'/, 'the rows should scroll inside the table container');
for (const { label, sx } of headerStyles) {
  assert.equal(property(sx, 'position')?.initializer.getText(source), "'sticky'", `${label} header should stay fixed`);
}

console.log('Cabeçalho completo fica fixo enquanto as linhas dos controles rolam.');
