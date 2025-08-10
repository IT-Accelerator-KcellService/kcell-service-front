import { create } from 'zustand';

interface RequestState {
    requests: Request[];
    incomingRequests: Request[];
    myRequests: Request[];
    assignedRequests: Request[];
    completedRequests: Request[];

    // Actions
    setRequests: (requests: Request[] | ((prev: Request[]) => Request[])) => void;
    setIncomingRequests: (requests: Request[] | ((prev: Request[]) => Request[])) => void;
    setMyRequests: (requests: Request[] | ((prev: Request[]) => Request[])) => void;
    setAssignedRequests: (requests: Request[] | ((prev: Request[]) => Request[])) => void;
    setCompletedRequests: (requests: Request[] | ((prev: Request[]) => Request[])) => void;
    addRequests: (newRequests: Request[]) => void;
    clearRequests: () => void;
    removeRequest: (id: number) => void;
    removeMyRequest: (id: number) => void;
    removeIncomingRequest: (id: number) => void;
    removeAssignedRequests: (id: number) => void;
}

export interface Request {
    executor_id: any;
    actual_completion_date: any;
    sla: string;
    date_submitted: string;
    category: Category;
    office: any;
    complexity: string;
    id: number;
    title: string;
    description: string;
    status: string;
    request_type: string;
    location: string;
    location_detail: string;
    created_date: string;
    executor: {user: { full_name: any } };
    rating?: number;
    category_id?: number;
    photos?: Photo[];
    office_id: number;
    planned_date: string;
    client_id: number;
}

interface Category {
    id: number;
    name: string;
}

interface Photo {
    id: number;
    request_id: number;
    photo_url: string;
    type: string;
}

export const sortRequests = (requests: Request[]): Request[] => {
    return [...requests].sort((a, b) => {
        // Сначала заявки в работе
        const aInProgress = a.status === "in_progress";
        const bInProgress = b.status === "in_progress";
        if (aInProgress !== bInProgress) return aInProgress ? -1 : 1;

        // Затем срочные заявки
        if (a.request_type === "urgent" && b.request_type !== "urgent") return -1;
        if (b.request_type === "urgent" && a.request_type !== "urgent") return 1;

        // Затем по дате (новые выше)
        const dateA = a.created_date ? new Date(a.created_date).getTime() : 0;
        const dateB = b.created_date ? new Date(b.created_date).getTime() : 0;
        return dateB - dateA;
    });
};

export const useRequestStore = create<RequestState>((set, get) => ({
    requests: [],
    incomingRequests: [],
    myRequests: [],
    assignedRequests: [],
    completedRequests: [],

    setRequests: (requests) =>
        set((state) => ({
            requests: Array.isArray(requests)
                ? requests
                : requests(state.requests),
        })),

    setIncomingRequests: (incomingRequests) =>
        set((state) => ({
            incomingRequests: Array.isArray(incomingRequests)
                ? incomingRequests
                : incomingRequests(state.incomingRequests),
        })),

    setMyRequests: (myRequests) =>
        set((state) => ({
            myRequests: Array.isArray(myRequests)
                ? myRequests
                : myRequests(state.myRequests),
        })),

    setAssignedRequests: (assignedRequests) =>
        set((state) => ({
            assignedRequests: Array.isArray(assignedRequests)
                ? assignedRequests
                : assignedRequests(state.assignedRequests),
        })),

    setCompletedRequests: (completedRequests) =>
        set((state) => ({
            completedRequests: Array.isArray(completedRequests)
                ? completedRequests
                : completedRequests(state.completedRequests),
        })),

    addRequests: (newRequests) => {
        const currentRequests = get().requests;
        const requestIds = new Set(currentRequests.map(r => r.id));
        const filteredNew = newRequests.filter(r => !requestIds.has(r.id));
        set({ requests: [...currentRequests, ...filteredNew] });
    },

    clearRequests: () => set({ incomingRequests: [], requests: [], myRequests: [], completedRequests: [] }),

    removeRequest: (id) =>
        set({
            requests: get().requests.filter(req => req.id !== id),
        }),

    removeMyRequest: (id) =>
        set({
            myRequests: get().myRequests.filter(req => req.id !== id),
        }),

    removeIncomingRequest: (id) =>
        set({
            incomingRequests: get().incomingRequests.filter(req => req.id !== id),
        }),

    removeAssignedRequests: (id) =>
        set({
            assignedRequests: get().assignedRequests.filter(req => req.id !== id),
        }),
}));