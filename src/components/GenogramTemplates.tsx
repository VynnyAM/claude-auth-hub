import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Heart, Baby, UserPlus, Home } from 'lucide-react';
import { GenogramElement } from '@/hooks/useGenogram';

interface GenogramTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (elements: GenogramElement[]) => void;
}

export const GenogramTemplates = ({ open, onOpenChange, onSelectTemplate }: GenogramTemplatesProps) => {
  
  // Template 1: Família Nuclear Tradicional (Pais + 2 filhos)
  const templateFamiliaNuclear = (): GenogramElement[] => {
    const baseId = Date.now();
    return [
      // Pai
      { id: baseId + 1, type: 'male', x: 350, y: 150, name: 'Pai', age: '45', status: 'alive' },
      // Mãe
      { id: baseId + 2, type: 'female', x: 550, y: 150, name: 'Mãe', age: '42', status: 'alive' },
      // Filho 1
      { id: baseId + 3, type: 'male', x: 380, y: 310, name: 'Filho', age: '15', status: 'alive' },
      // Filha
      { id: baseId + 4, type: 'female', x: 520, y: 310, name: 'Filha', age: '12', status: 'alive' },
      // Casamento
      { id: baseId + 5, type: 'relation', relationType: 'marriage', from: baseId + 1, to: baseId + 2, x: 0, y: 0 },
      // Filhos
      { id: baseId + 6, type: 'relation', relationType: 'children', from: baseId + 1, to: baseId + 2, x: 0, y: 0, children: [baseId + 3, baseId + 4] },
    ];
  };

  // Template 2: Família Monoparental (Mãe + 2 filhos)
  const templateFamiliaMonoparental = (): GenogramElement[] => {
    const baseId = Date.now();
    return [
      // Mãe
      { id: baseId + 1, type: 'female', x: 450, y: 150, name: 'Mãe', age: '38', status: 'alive' },
      // Filho
      { id: baseId + 2, type: 'male', x: 380, y: 310, name: 'Filho', age: '10', status: 'alive' },
      // Filha
      { id: baseId + 3, type: 'female', x: 520, y: 310, name: 'Filha', age: '7', status: 'alive' },
      // Relação de filhos (mãe solo)
      { id: baseId + 4, type: 'relation', relationType: 'children', from: baseId + 1, to: baseId + 1, x: 0, y: 0, children: [baseId + 2, baseId + 3] },
    ];
  };

  // Template 3: Família com 3 Gerações (Avós + Pais + Netos)
  const templateTresGeracoes = (): GenogramElement[] => {
    const baseId = Date.now();
    return [
      // Avô paterno
      { id: baseId + 1, type: 'male', x: 250, y: 80, name: 'Avô', age: '70', status: 'alive' },
      // Avó paterna
      { id: baseId + 2, type: 'female', x: 390, y: 80, name: 'Avó', age: '68', status: 'alive' },
      // Avô materno
      { id: baseId + 3, type: 'male', x: 510, y: 80, name: 'Avô', age: '72', status: 'alive' },
      // Avó materna
      { id: baseId + 4, type: 'female', x: 650, y: 80, name: 'Avó', age: '69', status: 'alive' },
      
      // Pai
      { id: baseId + 5, type: 'male', x: 350, y: 220, name: 'Pai', age: '45', status: 'alive' },
      // Mãe
      { id: baseId + 6, type: 'female', x: 550, y: 220, name: 'Mãe', age: '43', status: 'alive' },
      
      // Neto
      { id: baseId + 7, type: 'male', x: 380, y: 380, name: 'Neto', age: '8', status: 'alive' },
      // Neta
      { id: baseId + 8, type: 'female', x: 520, y: 380, name: 'Neta', age: '5', status: 'alive' },
      
      // Casamento avós paternos
      { id: baseId + 9, type: 'relation', relationType: 'marriage', from: baseId + 1, to: baseId + 2, x: 0, y: 0 },
      // Casamento avós maternos
      { id: baseId + 10, type: 'relation', relationType: 'marriage', from: baseId + 3, to: baseId + 4, x: 0, y: 0 },
      // Pai é filho dos avós paternos
      { id: baseId + 11, type: 'relation', relationType: 'children', from: baseId + 1, to: baseId + 2, x: 0, y: 0, children: [baseId + 5] },
      // Mãe é filha dos avós maternos
      { id: baseId + 12, type: 'relation', relationType: 'children', from: baseId + 3, to: baseId + 4, x: 0, y: 0, children: [baseId + 6] },
      // Casamento pais
      { id: baseId + 13, type: 'relation', relationType: 'marriage', from: baseId + 5, to: baseId + 6, x: 0, y: 0 },
      // Netos
      { id: baseId + 14, type: 'relation', relationType: 'children', from: baseId + 5, to: baseId + 6, x: 0, y: 0, children: [baseId + 7, baseId + 8] },
    ];
  };

  // Template 4: Família Reconstruída (Padrasto/Madrasta)
  const templateFamiliaReconstruida = (): GenogramElement[] => {
    const baseId = Date.now();
    return [
      // Pai biológico
      { id: baseId + 1, type: 'male', x: 250, y: 150, name: 'Pai Biológico', age: '42', status: 'alive' },
      // Mãe
      { id: baseId + 2, type: 'female', x: 450, y: 150, name: 'Mãe', age: '40', status: 'alive' },
      // Padrasto
      { id: baseId + 3, type: 'male', x: 650, y: 150, name: 'Padrasto', age: '45', status: 'alive' },
      
      // Filho da primeira união
      { id: baseId + 4, type: 'male', x: 300, y: 310, name: 'Filho (1ª união)', age: '14', status: 'alive' },
      // Filha da primeira união
      { id: baseId + 5, type: 'female', x: 400, y: 310, name: 'Filha (1ª união)', age: '11', status: 'alive' },
      // Filho da segunda união
      { id: baseId + 6, type: 'male', x: 550, y: 310, name: 'Filho (2ª união)', age: '3', status: 'alive' },
      
      // Primeira união (divorciada)
      { id: baseId + 7, type: 'relation', relationType: 'divorce', from: baseId + 1, to: baseId + 2, x: 0, y: 0 },
      // Filhos da primeira união
      { id: baseId + 8, type: 'relation', relationType: 'children', from: baseId + 1, to: baseId + 2, x: 0, y: 0, children: [baseId + 4, baseId + 5] },
      // Segunda união (casamento atual)
      { id: baseId + 9, type: 'relation', relationType: 'marriage', from: baseId + 2, to: baseId + 3, x: 0, y: 0 },
      // Filho da segunda união
      { id: baseId + 10, type: 'relation', relationType: 'children', from: baseId + 2, to: baseId + 3, x: 0, y: 0, children: [baseId + 6] },
    ];
  };

  // Template 5: Casal sem Filhos
  const templateCasalSemFilhos = (): GenogramElement[] => {
    const baseId = Date.now();
    return [
      // Marido
      { id: baseId + 1, type: 'male', x: 380, y: 200, name: 'Marido', age: '35', status: 'alive' },
      // Esposa
      { id: baseId + 2, type: 'female', x: 520, y: 200, name: 'Esposa', age: '33', status: 'alive' },
      // Casamento
      { id: baseId + 3, type: 'relation', relationType: 'marriage', from: baseId + 1, to: baseId + 2, x: 0, y: 0 },
    ];
  };

  const templates = [
    {
      id: 'nuclear',
      title: 'Família Nuclear',
      description: 'Pais casados com 2 filhos (configuração tradicional)',
      icon: Users,
      color: 'bg-blue-500',
      generate: templateFamiliaNuclear,
    },
    {
      id: 'monoparental',
      title: 'Família Monoparental',
      description: 'Mãe solo com 2 filhos',
      icon: UserPlus,
      color: 'bg-purple-500',
      generate: templateFamiliaMonoparental,
    },
    {
      id: 'tres-geracoes',
      title: 'Três Gerações',
      description: 'Avós, pais e netos (família intergeracional)',
      icon: Home,
      color: 'bg-green-500',
      generate: templateTresGeracoes,
    },
    {
      id: 'reconstruida',
      title: 'Família Reconstruída',
      description: 'Pais divorciados, novo casamento e meio-irmãos',
      icon: Heart,
      color: 'bg-orange-500',
      generate: templateFamiliaReconstruida,
    },
    {
      id: 'casal',
      title: 'Casal sem Filhos',
      description: 'Casal casado sem descendentes',
      icon: Baby,
      color: 'bg-pink-500',
      generate: templateCasalSemFilhos,
    },
  ];

  const handleSelectTemplate = (template: typeof templates[0]) => {
    const elements = template.generate();
    onSelectTemplate(elements);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Templates de Genograma</DialogTitle>
          <DialogDescription>
            Escolha um modelo para começar rapidamente. Você pode editá-lo depois.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {templates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="flex flex-col p-4 border-2 rounded-lg hover:border-primary hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className={`${template.color} p-2 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground ml-14">
                  {template.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-2">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Após selecionar um template, você pode adicionar mais membros, 
            editar nomes, idades e criar novas relações conforme necessário.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
