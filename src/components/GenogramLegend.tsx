import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface GenogramLegendProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GenogramLegend = ({ open, onOpenChange }: GenogramLegendProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Legenda do Genograma</DialogTitle>
          <DialogDescription>
            Símbolos e convenções utilizados no genograma familiar
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Pessoas */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Pessoas</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-blue-500 bg-blue-500/20 rounded-sm flex items-center justify-center">
                    <span className="text-xs font-bold">□</span>
                  </div>
                  <div>
                    <p className="font-medium">Homem</p>
                    <p className="text-sm text-muted-foreground">Representado por um quadrado azul</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-pink-500 bg-pink-500/20 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">○</span>
                  </div>
                  <div>
                    <p className="font-medium">Mulher</p>
                    <p className="text-sm text-muted-foreground">Representada por um círculo rosa</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-purple-500 bg-purple-500/20 flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                    <span className="text-xs font-bold">⬡</span>
                  </div>
                  <div>
                    <p className="font-medium">Pessoa (Gênero Neutro)</p>
                    <p className="text-sm text-muted-foreground">Representada por um hexágono roxo</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-blue-500 bg-blue-500/20 rounded-sm flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                  <div>
                    <p className="font-medium">Vivo</p>
                    <p className="text-sm text-muted-foreground">Símbolo preenchido normalmente</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-gray-500 bg-gray-500/20 rounded-sm flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-700">✕</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Falecido</p>
                    <p className="text-sm text-muted-foreground">X desenhado sobre o símbolo</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-400 bg-gray-200" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
                  </div>
                  <div>
                    <p className="font-medium">Aborto/Perda</p>
                    <p className="text-sm text-muted-foreground">Triângulo pequeno cinza</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Relacionamentos */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Relacionamentos</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-foreground"></div>
                  </div>
                  <div>
                    <p className="font-medium">Casamento</p>
                    <p className="text-sm text-muted-foreground">Linha sólida horizontal</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 flex items-center justify-center">
                    <div className="w-full h-0.5 border-t-2 border-dashed border-foreground"></div>
                  </div>
                  <div>
                    <p className="font-medium">União Estável</p>
                    <p className="text-sm text-muted-foreground">Linha tracejada horizontal</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 flex items-center justify-center relative">
                    <div className="w-full h-0.5 bg-foreground"></div>
                    <div className="absolute" style={{ left: '40%' }}>
                      <div className="w-0.5 h-3 bg-foreground"></div>
                      <div className="w-0.5 h-3 bg-foreground ml-1"></div>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">Divórcio</p>
                    <p className="text-sm text-muted-foreground">Linha com duas barras verticais</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 flex items-center justify-center relative">
                    <div className="w-full h-0.5 bg-foreground"></div>
                    <div className="absolute w-0.5 h-3 bg-foreground" style={{ left: '50%' }}></div>
                  </div>
                  <div>
                    <p className="font-medium">Separação</p>
                    <p className="text-sm text-muted-foreground">Linha com uma barra vertical</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-20 h-12 flex items-center justify-center">
                    <div className="w-full h-0.5 bg-blue-500"></div>
                  </div>
                  <div>
                    <p className="font-medium">Irmãos</p>
                    <p className="text-sm text-muted-foreground">Linha azul sólida horizontal</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Seleção */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Seleção</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-2 border-dashed border-yellow-500 bg-blue-500/20 rounded-sm"></div>
                  <div>
                    <p className="font-medium">Elemento Selecionado</p>
                    <p className="text-sm text-muted-foreground">Contorno tracejado amarelo</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border-4 border-green-500 bg-blue-500/20 rounded-sm shadow-lg shadow-green-500/50"></div>
                  <div>
                    <p className="font-medium">Resultado de Busca</p>
                    <p className="text-sm text-muted-foreground">Contorno verde brilhante destacado</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
