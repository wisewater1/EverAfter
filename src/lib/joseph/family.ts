import { supabase } from '../supabase';

export interface FamilyTask {
    id: string;
    action: string;
    description: string;
    assignedTo?: string;
    status: 'pending' | 'completed';
    category: 'chore' | 'maintenance' | 'errand';
    dueDate?: string;
}

export interface FamilyEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
    attendees: string[];
}

export interface ShoppingItem {
    id: string;
    name: string;
    quantity: string;
    addedBy: string;
    status: 'needed' | 'bought';
}

export interface HouseholdSummary {
    activeTasks: number;
    upcomingEvents: number;
    shoppingListCount: number;
    familyStatus: { name: string; status: 'home' | 'away' | 'busy' }[];
}

export async function getHouseholdSummary(userId: string): Promise<HouseholdSummary> {
    try {
        // This would normally fetch from specialized tables
        // For now, we mock it based on established patterns in EverAfter
        return {
            activeTasks: 5,
            upcomingEvents: 2,
            shoppingListCount: 8,
            familyStatus: [
                { name: 'Alice', status: 'home' },
                { name: 'Bob', status: 'away' },
                { name: 'Charlie', status: 'busy' }
            ]
        };
    } catch (error) {
        console.error('Error fetching household summary:', error);
        return {
            activeTasks: 0,
            upcomingEvents: 0,
            shoppingListCount: 0,
            familyStatus: []
        };
    }
}

export async function getFamilyTasks(userId: string): Promise<FamilyTask[]> {
    // Mocking family tasks
    return [
        { id: '1', action: 'Mow Lawn', description: 'Front and back yard', status: 'pending', category: 'chore' },
        { id: '2', action: 'Fix Faucet', description: 'Kitchen sink leak', status: 'pending', category: 'maintenance' },
        { id: '3', action: 'Pick up Dry Cleaning', description: 'Suits for the wedding', status: 'completed', category: 'errand' }
    ];
}

export async function getShoppingList(userId: string): Promise<ShoppingItem[]> {
    return [
        { id: 's1', name: 'Milk', quantity: '2 gallons', addedBy: 'Alice', status: 'needed' },
        { id: 's2', name: 'Eggs', quantity: '1 dozen', addedBy: 'Bob', status: 'needed' },
        { id: 's3', name: 'Bread', quantity: '2 loaves', addedBy: 'Charlie', status: 'bought' }
    ];
}

export async function getFamilyCalendar(userId: string): Promise<FamilyEvent[]> {
    return [
        { id: 'e1', title: 'Family Dinner', startTime: new Date().toISOString(), endTime: new Date().toISOString(), attendees: ['All'] },
        { id: 'e2', title: 'Soccer Practice', startTime: new Date().toISOString(), endTime: new Date().toISOString(), attendees: ['Charlie'] }
    ];
}
