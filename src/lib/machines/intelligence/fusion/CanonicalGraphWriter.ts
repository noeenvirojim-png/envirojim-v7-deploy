/**
 * Canonical Graph Writer
 * Persists fusion results to canonical graph schema (additive, reversible)
 * Pure append operations, no modifications to source entity tables
 */

import type { CanonicalCluster } from './EntityFusionService';

type SupabaseClient = any; // Typed as any to avoid import issues

export interface GraphWriteResult {
  success: boolean;
  clustersWritten: number;
  aliasesWritten: number;
  membersWritten: number;
  linksWritten: number;
  error?: string;
  runId?: string;
}

/**
 * Write canonical clusters to DB
 */
export async function writeCanonicalClusters(
  supabase: SupabaseClient,
  machineId: string,
  organizationId: string,
  clusters: CanonicalCluster[]
): Promise<{ runId: string; clusterIds: Map<string, string> }> {
  const clusterIds = new Map<string, string>();

  const clusterRows = clusters.map(c => ({
    machine_id: machineId,
    canonical_name: c.canonical_name,
    cluster_type: c.cluster_type,
    confidence: c.confidence,
    source_entity_count: c.source_entity_ids.length,
    source_doc_count: c.source_docs.length,
  }));

  const { data: inserted, error } = await supabase
    .from('canonical_clusters')
    .insert(clusterRows)
    .select('id, canonical_name, cluster_type');

  if (error) {
    throw new Error(`Failed to write clusters: ${error.message}`);
  }

  // Map original cluster IDs to DB IDs
  if (inserted) {
    for (let i = 0; i < inserted.length; i++) {
      clusterIds.set(clusters[i].cluster_id, inserted[i].id);
    }
  }

  // Log fusion run
  const { data: runData } = await supabase
    .from('canonical_fusion_runs')
    .insert({
      machine_id: machineId,
      organization_id: organizationId,
      source_entity_count: clusters.reduce((s, c) => s + c.source_entity_ids.length, 0),
      source_document_count: new Set(clusters.flatMap(c => c.source_docs)).size,
      canonical_cluster_count: clusters.length,
    })
    .select('id')
    .single();

  return {
    runId: runData?.id || 'unknown',
    clusterIds,
  };
}

/**
 * Write aliases for clusters
 */
export async function writeCanonicalAliases(
  supabase: SupabaseClient,
  clusterIds: Map<string, string>,
  clusters: CanonicalCluster[]
): Promise<number> {
  const aliasRows: any[] = [];

  for (const cluster of clusters) {
    const dbClusterId = clusterIds.get(cluster.cluster_id);
    if (!dbClusterId) continue;

    for (const alias of cluster.aliases) {
      if (alias !== cluster.canonical_name) {
        // Detect language from special chars
        const language = /[äöüß]/.test(alias) ? 'de' : /[àâäçèéêëìîïñòôöùûüý]/.test(alias) ? 'fr' : 'en';

        aliasRows.push({
          cluster_id: dbClusterId,
          alias,
          language_or_variant: language,
        });
      }
    }
  }

  if (aliasRows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('canonical_cluster_aliases')
    .insert(aliasRows);

  if (error) {
    throw new Error(`Failed to write aliases: ${error.message}`);
  }

  return aliasRows.length;
}

/**
 * Write cluster members (source entity links)
 */
export async function writeCanonicalMembers(
  supabase: SupabaseClient,
  clusterIds: Map<string, string>,
  clusters: CanonicalCluster[]
): Promise<number> {
  const memberRows: any[] = [];

  for (const cluster of clusters) {
    const dbClusterId = clusterIds.get(cluster.cluster_id);
    if (!dbClusterId) continue;

    for (let i = 0; i < cluster.source_entity_ids.length; i++) {
      memberRows.push({
        cluster_id: dbClusterId,
        source_entity_id: cluster.source_entity_ids[i],
        source_entity_type: cluster.source_entity_types[i],
        evidence_count: cluster.evidence_refs.filter(
          e => e.entity_id === cluster.source_entity_ids[i]
        ).length,
      });
    }
  }

  if (memberRows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('canonical_cluster_members')
    .insert(memberRows);

  if (error) {
    throw new Error(`Failed to write members: ${error.message}`);
  }

  return memberRows.length;
}

/**
 * Write cluster-to-cluster links
 */
export async function writeCanonicalLinks(
  supabase: SupabaseClient,
  clusterIds: Map<string, string>,
  clusters: CanonicalCluster[]
): Promise<number> {
  const linkRows: any[] = [];

  for (const cluster of clusters) {
    const fromClusterId = clusterIds.get(cluster.cluster_id);
    if (!fromClusterId) continue;

    // Link to linked parts
    if (cluster.linked_parts.length > 0) {
      const partCluster = clusters.find(c => c.cluster_type === 'part' && c.linked_parts.includes(cluster.canonical_name));
      if (partCluster) {
        const toClusterId = clusterIds.get(partCluster.cluster_id);
        if (toClusterId) {
          linkRows.push({
            from_cluster_id: fromClusterId,
            to_cluster_id: toClusterId,
            link_type: 'uses_part',
            confidence: 'medium',
          });
        }
      }
    }

    // Link to maintenance tasks
    if (cluster.linked_maintenance_tasks.length > 0) {
      const maintCluster = clusters.find(
        c =>
          c.cluster_type === 'maintenance_target' &&
          cluster.linked_maintenance_tasks.some(t => t.includes(c.canonical_name))
      );
      if (maintCluster) {
        const toClusterId = clusterIds.get(maintCluster.cluster_id);
        if (toClusterId) {
          linkRows.push({
            from_cluster_id: fromClusterId,
            to_cluster_id: toClusterId,
            link_type: 'used_in',
            confidence: 'medium',
          });
        }
      }
    }

    // Link to faults
    if (cluster.linked_faults.length > 0) {
      const faultCluster = clusters.find(
        c => c.cluster_type === 'fault_target' && cluster.linked_faults.some(f => f.includes(c.canonical_name))
      );
      if (faultCluster) {
        const toClusterId = clusterIds.get(faultCluster.cluster_id);
        if (toClusterId) {
          linkRows.push({
            from_cluster_id: fromClusterId,
            to_cluster_id: toClusterId,
            link_type: 'caused_by',
            confidence: 'medium',
          });
        }
      }
    }
  }

  if (linkRows.length === 0) {
    return 0;
  }

  const { error } = await supabase
    .from('canonical_cluster_links')
    .insert(linkRows)
    .on('CONFLICT', (conflict: any) => conflict.ignore()); // Ignore duplicates

  if (error && !error.message.includes('UNIQUE')) {
    throw new Error(`Failed to write links: ${error.message}`);
  }

  return linkRows.length;
}

/**
 * Master write function
 */
export async function writeFusionToCanonicalGraph(
  supabase: SupabaseClient,
  machineId: string,
  organizationId: string,
  clusters: CanonicalCluster[]
): Promise<GraphWriteResult> {
  try {
    console.log(`[Canonical Graph] Writing ${clusters.length} clusters for machine ${machineId}`);

    // Write clusters
    const { runId, clusterIds } = await writeCanonicalClusters(
      supabase,
      machineId,
      organizationId,
      clusters
    );

    // Write aliases
    const aliasCount = await writeCanonicalAliases(supabase, clusterIds, clusters);

    // Write members
    const memberCount = await writeCanonicalMembers(supabase, clusterIds, clusters);

    // Write links
    const linkCount = await writeCanonicalLinks(supabase, clusterIds, clusters);

    // Update fusion run with counts
    await supabase
      .from('canonical_fusion_runs')
      .update({
        aliases_created: aliasCount,
        members_created: memberCount,
        links_created: linkCount,
      })
      .eq('id', runId);

    return {
      success: true,
      clustersWritten: clusters.length,
      aliasesWritten: aliasCount,
      membersWritten: memberCount,
      linksWritten: linkCount,
      runId,
    };
  } catch (err) {
    return {
      success: false,
      clustersWritten: 0,
      aliasesWritten: 0,
      membersWritten: 0,
      linksWritten: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
