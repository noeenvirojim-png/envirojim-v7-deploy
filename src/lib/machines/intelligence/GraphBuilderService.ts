import { GraphicNode, GraphicEdge, KbConfidence } from './types';

export class GraphBuilderService {
  /**
   * Builds graphs from consolidated KB entities.
   */
  async buildGraphs(entities: any[]): Promise<{
    system: { nodes: GraphicNode[], edges: GraphicEdge[] };
    causal: { nodes: GraphicNode[], edges: GraphicEdge[] };
    technical: { nodes: GraphicNode[], edges: GraphicEdge[] };
  }> {
    const systemNodes: GraphicNode[] = [];
    const systemEdges: GraphicEdge[] = [];
    
    const causalNodes: GraphicNode[] = [];
    const causalEdges: GraphicEdge[] = [];

    // 1. Build System Hierarchies (System -> Assembly -> Part)
    entities.forEach(entity => {
      const node: GraphicNode = {
        id: entity.id || entity.canonical_name,
        type: entity.entity_type,
        label: entity.canonical_name,
        metadata: entity.normalized_payload
      };

      if (entity.entity_type === 'part' || entity.entity_type === 'assembly') {
        systemNodes.push(node);
        // If it has a parent/assembly_id, add edge
        if (entity.normalized_payload.assembly_id) {
          systemEdges.push({
            from: entity.normalized_payload.assembly_id,
            to: node.id,
            relation: 'contains',
            confidence: 'high',
            metadata: {}
          });
        }
      }

      if (entity.entity_type === 'fault_case') {
        causalNodes.push(node);
        // Link to possible causes (edges)
        if (entity.normalized_payload.possible_causes) {
          entity.normalized_payload.possible_causes.forEach((cause: string) => {
            causalEdges.push({
              from: node.id,
              to: cause,
              relation: 'caused_by',
              confidence: 'medium',
              metadata: {}
            });
          });
        }
      }
    });

    return {
      system: { nodes: systemNodes, edges: systemEdges },
      causal: { nodes: causalNodes, edges: causalEdges },
      technical: { nodes: [], edges: [] } // Technical (Elec/Hydrau) needs deeper logic
    };
  }
}
