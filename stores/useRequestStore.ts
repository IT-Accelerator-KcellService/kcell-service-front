import { create } from 'zustand';

interface RequestState {
    requests: RequestGroup[];
    incomingRequests: RequestGroup[];
    myRequests: RequestGroup[];
    assignedRequests: RequestGroup[];
    completedRequests: RequestGroup[];

    // Actions
    setRequests: (requests: RequestGroup[] | ((prev: RequestGroup[]) => RequestGroup[])) => void;
    setIncomingRequests: (requests: RequestGroup[] | ((prev: RequestGroup[]) => RequestGroup[])) => void;
    setMyRequests: (requests: RequestGroup[] | ((prev: RequestGroup[]) => RequestGroup[])) => void;
    setAssignedRequests: (requests: RequestGroup[] | ((prev: RequestGroup[]) => RequestGroup[])) => void;
    setCompletedRequests: (requests: RequestGroup[] | ((prev: RequestGroup[]) => RequestGroup[])) => void;
    addRequests: (newRequests: RequestGroup[]) => void;
    clearRequests: () => void;
    removeRequest: (id: number) => void;
    removeMyRequest: (id: number) => void;
    removeIncomingRequest: (id: number) => void;
    removeAssignedRequests: (id: number) => void;
    updateSubRequestRating: (requestGroupId: number, subRequestId: number, rating: number) => void;
    updateSubRequestExecutors: (requestGroupId: number, subRequestId: number, executors: any[], status?: string) => void;
    updateRequestGroupStatus: (requestGroupId: number) => void;
    updateSubRequestRedirect: (requestGroupId: number, subRequestId: number, categoryId: number) => void;
}

export interface SubRequest {
    id: number;
    title: string;
    description: string;
    status: string;
    category_id?: number;
    category?: Category;
    complexity?: string;
    sla?: string;
    created_date: string;
    executor?: {user: { id: number; full_name: any; phone?: string }; RequestExecutor?: { role: string } }; // Для обратной совместимости
    executors?: Array<{user: { id: number; full_name: any; phone?: string; }; RequestExecutor?: { role: string } }>; // Новый массив исполнителей
    is_long_term?: boolean;
    ratings?: number;
    comment?: string;
    rating?: number
}

export interface RequestGroup {
    id: number;
    client_id: number;
    office_id: number;
    location: string;
    location_detail: string;
    date_submitted?: string;
    status: string;
    request_type: string;
    rejection_reason?: string;
    planned_date?: string;
    created_date: string;
    client?: { full_name: string; email: string; phone?: string };
    office?: { id: number; name: string; city: string; address?: string };
    photos?: Photo[];
    requests: SubRequest[];
    is_long_term?: boolean;
    // Поля для повторяющихся задач
    recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    recurrence_interval?: number;
    next_due_date?: string;
    last_completed_date?: string;
    recurring_status?: 'active' | 'paused' | 'completed';
}

// Для обратной совместимости
export interface Request extends RequestGroup {}

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

export const sortRequests = (requests: RequestGroup[]): RequestGroup[] => {
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

    clearRequests: () => set({ incomingRequests: [], requests: [], myRequests: [], completedRequests: [], assignedRequests: [] }),

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

    updateSubRequestRating: (requestGroupId, subRequestId, rating) =>
        set((state) => {
            const updateGroupRequests = (groups: RequestGroup[]) =>
                groups.map(group =>
                    group.id === requestGroupId
                        ? {
                            ...group,
                            requests: group.requests.map(subReq =>
                                subReq.id === subRequestId
                                    ? { ...subReq, rating }
                                    : subReq
                            )
                        }
                        : group
                );

            return {
                requests: updateGroupRequests(state.requests),
                incomingRequests: updateGroupRequests(state.incomingRequests),
                myRequests: updateGroupRequests(state.myRequests),
                assignedRequests: updateGroupRequests(state.assignedRequests),
                completedRequests: updateGroupRequests(state.completedRequests),
            };
        }),

    updateSubRequestExecutors: (requestGroupId, subRequestId, executors, status = 'assigned') =>
        set((state) => {
            const updateGroupRequests = (groups: RequestGroup[]) =>
                groups.map(group =>
                    group.id === requestGroupId
                        ? {
                            ...group,
                            requests: group.requests.map(subReq =>
                                subReq.id === subRequestId
                                    ? { ...subReq, executors, status }
                                    : subReq
                            )
                        }
                        : group
                );

            return {
                requests: updateGroupRequests(state.requests),
                incomingRequests: updateGroupRequests(state.incomingRequests),
                myRequests: updateGroupRequests(state.myRequests),
                assignedRequests: updateGroupRequests(state.assignedRequests),
                completedRequests: updateGroupRequests(state.completedRequests),
            };
        }),

    updateRequestGroupStatus: (requestGroupId) =>
        set((state) => {
            const updateGroupStatus = (groups: RequestGroup[]) =>
                groups.map(group => {
                    if (group.id !== requestGroupId) return group;
                    
                    const requests = group.requests;
                    if (requests.length === 0) return group;

                    // Определяем статус группы на основе статусов подзаявок (как в бэкенде)
                    let newStatus = 'in_progress';

                    const allCompleted = requests.every(req => req.status === 'completed');
                    const anyRejected = requests.some(req => req.status === 'rejected');
                    const anyAwaiting = requests.some(req =>
                        ['awaiting_assignment', 'awaiting_sla'].includes(req.status)
                    );
                    const anyInProgress = requests.some(req =>
                        ['execution', 'assigned'].includes(req.status)
                    );

                    if (allCompleted) {
                        newStatus = 'completed';
                    } else if (anyRejected) {
                        newStatus = 'rejected';
                    } else if (anyInProgress) {
                        newStatus = 'execution';
                    } else if (anyAwaiting) {
                        newStatus = 'awaiting_assignment';
                    }

                    return {
                        ...group,
                        status: newStatus
                    };
                });

            return {
                requests: updateGroupStatus(state.requests),
                incomingRequests: updateGroupStatus(state.incomingRequests),
                myRequests: updateGroupStatus(state.myRequests),
                assignedRequests: updateGroupStatus(state.assignedRequests),
                completedRequests: updateGroupStatus(state.completedRequests),
            };
        }),

    updateSubRequestRedirect: (requestGroupId, subRequestId, categoryId) =>
        set((state) => {
            const updateGroupRequests = (groups: RequestGroup[]) =>
                groups.map(group =>
                    group.id === requestGroupId
                        ? {
                            ...group,
                            requests: group.requests.map(subReq =>
                                subReq.id === subRequestId
                                    ? { ...subReq, category_id: categoryId }
                                    : subReq
                            )
                        }
                        : group
                );

            return {
                requests: updateGroupRequests(state.requests),
                incomingRequests: updateGroupRequests(state.incomingRequests),
                myRequests: updateGroupRequests(state.myRequests),
                assignedRequests: updateGroupRequests(state.assignedRequests),
                completedRequests: updateGroupRequests(state.completedRequests),
            };
        }),
}));