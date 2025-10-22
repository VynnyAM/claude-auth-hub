import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GenogramElement {
  id: number;
  type: string; // 'male', 'female', 'pregnancy', 'undefined', 'twins', 'fraternal-twins', 'identical-twins', 'pet', 'relation'
  x: number;
  y: number;
  name?: string;
  age?: string;
  birthDate?: string; // Data de nascimento
  deathDate?: string; // Data da morte
  status?: string; // 'alive', 'deceased', 'substance-abuse', 'recovering', 'mental-disorder', 'adopted', 'foster', 'miscarriage', 'abortion', 'stillborn', 'index-person'
  selected?: boolean;
  highlighted?: boolean;
  relationType?: string; // 'marriage', 'divorce', 'separation', 'living-together', 'back-together', 'children', 'siblings', etc.
  from?: number;
  to?: number;
  children?: number[];
  twinType?: 'fraternal' | 'identical'; // Tipo de gêmeos
}

export const useGenogram = (userId: string | undefined) => {
  const [genograms, setGenograms] = useState<any[]>([]);
  const [currentGenogramId, setCurrentGenogramId] = useState<string | null>(null);
  const [elements, setElements] = useState<GenogramElement[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load user's genograms
  const loadGenograms = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('genograms')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setGenograms(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar genogramas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Load genogram elements
  const loadGenogram = async (genogramId: string) => {
    setLoading(true);
    try {
      // Load genogram with notes
      const { data: genogramData, error: genogramError } = await supabase
        .from('genograms')
        .select('notes')
        .eq('id', genogramId)
        .single();

      if (genogramError) throw genogramError;

      // Load elements
      const { data, error } = await supabase
        .from('genogram_elements')
        .select('*')
        .eq('genogram_id', genogramId);

      if (error) throw error;
      
      const parsedElements = data?.map(item => item.element_data as unknown as GenogramElement) || [];
      setElements(parsedElements);
      setNotes(genogramData?.notes || '');
      setCurrentGenogramId(genogramId);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar genograma",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save genogram
  const saveGenogram = async (title: string = 'Novo Genograma', genogramNotes: string = '') => {
    if (!userId) return;
    
    setLoading(true);
    try {
      let genogramId = currentGenogramId;

      // Create or update genogram
      if (!genogramId) {
        const { data, error } = await supabase
          .from('genograms')
          .insert({ user_id: userId, title, notes: genogramNotes })
          .select()
          .single();

        if (error) throw error;
        genogramId = data.id;
        setCurrentGenogramId(genogramId);
      } else {
        const { error } = await supabase
          .from('genograms')
          .update({ title, notes: genogramNotes, updated_at: new Date().toISOString() })
          .eq('id', genogramId);

        if (error) throw error;
      }

      // Delete existing elements
      await supabase
        .from('genogram_elements')
        .delete()
        .eq('genogram_id', genogramId);

      // Insert new elements
      if (elements.length > 0) {
        const elementsToInsert = elements.map(element => ({
          genogram_id: genogramId,
          element_data: element as unknown as any,
        }));

        const { error } = await supabase
          .from('genogram_elements')
          .insert(elementsToInsert);

        if (error) throw error;
      }

      toast({
        title: "Genograma salvo!",
        description: "Suas alterações foram salvas com sucesso.",
      });

      await loadGenograms();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar genograma",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete genogram
  const deleteGenogram = async (genogramId: string) => {
    try {
      const { error } = await supabase
        .from('genograms')
        .delete()
        .eq('id', genogramId);

      if (error) throw error;

      toast({
        title: "Genograma excluído",
        description: "O genograma foi removido com sucesso.",
      });

      if (currentGenogramId === genogramId) {
        setCurrentGenogramId(null);
        setElements([]);
      }

      await loadGenograms();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir genograma",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Create new genogram
  const createNewGenogram = () => {
    setCurrentGenogramId(null);
    setElements([]);
    setNotes('');
  };

  useEffect(() => {
    if (userId) {
      loadGenograms();
    }
  }, [userId]);

  return {
    genograms,
    currentGenogramId,
    elements,
    setElements,
    notes,
    setNotes,
    loading,
    loadGenogram,
    saveGenogram,
    deleteGenogram,
    createNewGenogram,
  };
};
