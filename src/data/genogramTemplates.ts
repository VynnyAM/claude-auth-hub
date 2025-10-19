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
  {
    id: 'blended',
    name: 'Família Recasada',
    description: 'Casal com filhos de relacionamentos anteriores',
    elements: [
      // Ex-parceiros
      { id: 1, type: 'male', x: 200, y: 100, name: 'Ex-Marido', age: '45', status: 'alive' },
      { id: 2, type: 'female', x: 400, y: 100, name: 'Mãe', age: '42', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'divorce', x: 0, y: 0 },
      { id: 4, type: 'male', x: 600, y: 100, name: 'Padrasto', age: '48', status: 'alive' },
      { id: 5, type: 'female', x: 800, y: 100, name: 'Ex-Esposa', age: '46', status: 'alive' },
      { id: 6, type: 'relation', from: 4, to: 5, relationType: 'divorce', x: 0, y: 0 },
      // Novo casamento
      { id: 7, type: 'relation', from: 2, to: 4, relationType: 'marriage', x: 0, y: 0 },
      // Filhos do primeiro casamento
      { id: 8, type: 'male', x: 250, y: 250, name: 'Filho 1', age: '16', status: 'alive', children: [] },
      { id: 9, type: 'female', x: 350, y: 250, name: 'Filha 2', age: '14', status: 'alive', children: [] },
      // Filhos do segundo casamento
      { id: 10, type: 'male', x: 650, y: 250, name: 'Filho 3', age: '12', status: 'alive', children: [] },
      // Filho do novo casamento
      { id: 11, type: 'female', x: 500, y: 250, name: 'Filha 4', age: '5', status: 'alive', children: [] },
    ]
  },
  {
    id: 'adoption',
    name: 'Família com Adoção',
    description: 'Casal com filhos biológicos e adotados',
    elements: [
      { id: 1, type: 'male', x: 350, y: 150, name: 'Pai', age: '50', status: 'alive' },
      { id: 2, type: 'female', x: 550, y: 150, name: 'Mãe', age: '48', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      { id: 4, type: 'male', x: 350, y: 300, name: 'Filho Biológico', age: '20', status: 'alive', children: [] },
      { id: 5, type: 'female', x: 450, y: 300, name: 'Filha Adotada', age: '15', status: 'adopted', children: [] },
      { id: 6, type: 'male', x: 550, y: 300, name: 'Filho Adotado', age: '12', status: 'adopted', children: [] },
    ]
  },
  {
    id: 'four-generations',
    name: 'Quatro Gerações',
    description: 'Bisavós, avós, pais e netos',
    elements: [
      // Bisavós
      { id: 1, type: 'male', x: 350, y: 50, name: 'Bisavô', age: '90', status: 'alive' },
      { id: 2, type: 'female', x: 500, y: 50, name: 'Bisavó', age: '88', status: 'deceased' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      // Avós
      { id: 4, type: 'male', x: 300, y: 150, name: 'Avô', age: '68', status: 'alive' },
      { id: 5, type: 'female', x: 450, y: 150, name: 'Avó', age: '65', status: 'alive' },
      { id: 6, type: 'relation', from: 4, to: 5, relationType: 'marriage', x: 0, y: 0 },
      // Pais
      { id: 7, type: 'male', x: 325, y: 270, name: 'Pai', age: '42', status: 'alive' },
      { id: 8, type: 'female', x: 475, y: 270, name: 'Mãe', age: '40', status: 'alive' },
      { id: 9, type: 'relation', from: 7, to: 8, relationType: 'marriage', x: 0, y: 0 },
      // Netos
      { id: 10, type: 'female', x: 350, y: 390, name: 'Neta 1', age: '16', status: 'alive', children: [] },
      { id: 11, type: 'male', x: 450, y: 390, name: 'Neto 2', age: '13', status: 'alive', children: [] },
    ]
  },
  {
    id: 'twins',
    name: 'Família com Gêmeos',
    description: 'Casal com gêmeos e outros filhos',
    elements: [
      { id: 1, type: 'male', x: 350, y: 150, name: 'Pai', age: '40', status: 'alive' },
      { id: 2, type: 'female', x: 550, y: 150, name: 'Mãe', age: '38', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      { id: 4, type: 'female', x: 300, y: 300, name: 'Filha 1', age: '12', status: 'alive', children: [] },
      { id: 5, type: 'twins', x: 450, y: 300, name: 'Gêmeos', age: '8', status: 'alive', children: [] },
      { id: 6, type: 'male', x: 600, y: 300, name: 'Filho 2', age: '5', status: 'alive', children: [] },
    ]
  },
  {
    id: 'loss',
    name: 'Família com Perdas',
    description: 'Família com membros falecidos e abortos',
    elements: [
      // Avós
      { id: 1, type: 'male', x: 250, y: 100, name: 'Avô', age: '75', status: 'deceased' },
      { id: 2, type: 'female', x: 400, y: 100, name: 'Avó', age: '72', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      // Pais
      { id: 4, type: 'male', x: 325, y: 250, name: 'Pai', age: '48', status: 'alive' },
      { id: 5, type: 'female', x: 525, y: 250, name: 'Mãe', age: '45', status: 'alive' },
      { id: 6, type: 'relation', from: 4, to: 5, relationType: 'marriage', x: 0, y: 0 },
      // Filhos
      { id: 7, type: 'male', x: 300, y: 400, name: 'Filho 1', age: '20', status: 'alive', children: [] },
      { id: 8, type: 'female', x: 400, y: 400, name: 'Filha', age: '8', status: 'stillborn', children: [] },
      { id: 9, type: 'pregnancy', x: 500, y: 400, name: 'Aborto', age: '', status: 'miscarriage', children: [] },
      { id: 10, type: 'male', x: 600, y: 400, name: 'Filho 2', age: '15', status: 'alive', children: [] },
    ]
  },
  {
    id: 'complex-relationships',
    name: 'Relações Complexas',
    description: 'Família com diversos tipos de relacionamentos',
    elements: [
      // Casal principal
      { id: 1, type: 'male', x: 300, y: 150, name: 'Marido', age: '45', status: 'alive' },
      { id: 2, type: 'female', x: 500, y: 150, name: 'Esposa', age: '43', status: 'alive' },
      { id: 3, type: 'relation', from: 1, to: 2, relationType: 'marriage', x: 0, y: 0 },
      // Irmão do marido
      { id: 4, type: 'male', x: 150, y: 150, name: 'Irmão', age: '42', status: 'alive' },
      { id: 5, type: 'relation', from: 1, to: 4, relationType: 'conflict', x: 0, y: 0 },
      // Irmã da esposa
      { id: 6, type: 'female', x: 650, y: 150, name: 'Irmã', age: '40', status: 'alive' },
      { id: 7, type: 'relation', from: 2, to: 6, relationType: 'alliance', x: 0, y: 0 },
      // Filhos
      { id: 8, type: 'male', x: 350, y: 300, name: 'Filho 1', age: '18', status: 'alive', children: [] },
      { id: 9, type: 'female', x: 450, y: 300, name: 'Filha', age: '15', status: 'alive', children: [] },
      { id: 10, type: 'relation', from: 8, to: 9, relationType: 'harmonic', x: 0, y: 0 },
      // Animal de estimação
      { id: 11, type: 'pet', x: 550, y: 300, name: 'Rex', age: '5', status: 'alive', children: [] },
    ]
  },
];
