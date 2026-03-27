// Simple dictionary for robust client-side translation
export const DICTIONARY = {
    en: {
        nav_dashboard: "Dashboard",
        nav_machines: "Machines",
        nav_tickets: "Support Tickets",
        nav_interventions: "Work Orders",
        nav_search: "Manual Search",
        btn_create: "Create",
        status_open: "Open",
        status_closed: "Closed",
        label_machine: "Machine",
        label_description: "Description",
        msg_no_data: "No data found.",
    },
    fr: {
        nav_dashboard: "Tableau de Bord",
        nav_machines: "Machines",
        nav_tickets: "Tickets Support",
        nav_interventions: "Bons de Travail",
        nav_search: "Recherche Manuels",
        btn_create: "Créer",
        status_open: "Ouvert",
        status_closed: "Fermé",
        label_machine: "Machine",
        label_description: "Description",
        msg_no_data: "Aucune donnée trouvée.",
    }
} as const;

export type Locale = keyof typeof DICTIONARY;
export type ValidToken = keyof typeof DICTIONARY['en'];
