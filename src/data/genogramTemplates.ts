import { GenogramElement } from '@/hooks/useGenogram';

export interface GenogramTemplate {
  id: string;
  name: string;
  description: string;
  elements: GenogramElement[];
}

export const genogramTemplates: GenogramTemplate[] = [
  {
    id: 'nuclear',
    name: 'Família Nuclear',
    description: 'Casal com 2 filhos',
    elements: [
      { id: 1, type: 'male', x: 300, y: 150, name: 'Pai', age: '45', status: 'alive' },
      { id: 2, type: 'female', x: 500, y: 150, name: 'Mãe', age: '42', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      { id: 4, type: 'male', x: 350, y: 300, name: 'Filho 1', age: '15', status: 'alive', children: [] },
      { id: 5, type: 'female', x: 450, y: 300, name: 'Filha 2', age: '12', status: 'alive', children: [] },
    ]
  },
  {
    id: 'extended',
    name: 'Família Estendida',
    description: '3 gerações (avós, pais, filhos)',
    elements: [
      // Avós
      { id: 1, type: 'male', x: 250, y: 100, name: 'Avô Paterno', age: '70', status: 'alive' },
      { id: 2, type: 'female', x: 400, y: 100, name: 'Avó Paterna', age: '68', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      // Pais
      { id: 4, type: 'male', x: 325, y: 250, name: 'Pai', age: '45', status: 'alive' },
      { id: 5, type: 'female', x: 525, y: 250, name: 'Mãe', age: '42', status: 'alive' },
      { id: 6, type: 'relation', from: 4, to: 5, relationType: 'marriage', x: 0, y: 0 },
      // Filhos
      { id: 7, type: 'female', x: 375, y: 400, name: 'Filha 1', age: '18', status: 'alive', children: [] },
      { id: 8, type: 'male', x: 475, y: 400, name: 'Filho 2', age: '15', status: 'alive', children: [] },
    ]
  },
  {
    id: 'couple',
    name: 'Casal Sem Filhos',
    description: 'Apenas marido e esposa',
    elements: [
      { id: 1, type: 'male', x: 350, y: 200, name: 'Marido', age: '38', status: 'alive' },
      { id: 2, type: 'female', x: 550, y: 200, name: 'Esposa', age: '35', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
    ]
  },
  {
    id: 'single-parent',
    name: 'Família Monoparental',
    description: '1 pai/mãe com 2 filhos',
    elements: [
      { id: 1, type: 'female', x: 400, y: 150, name: 'Mãe', age: '40', status: 'alive' },
      { id: 2, type: 'male', x: 350, y: 300, name: 'Filho 1', age: '14', status: 'alive', children: [] },
      { id: 3, type: 'female', x: 450, y: 300, name: 'Filha 2', age: '10', status: 'alive', children: [] },
    ]
  },
];
