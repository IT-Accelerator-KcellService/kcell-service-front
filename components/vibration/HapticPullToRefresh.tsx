// HapticPullToRefresh.tsx
import React, { ReactNode } from "react";
import { RefreshControl, ScrollView, ScrollViewProps } from "react-native";
import ReactNativeHapticFeedback, { HapticFeedbackTypes } from "react-native-haptic-feedback";

interface HapticPullToRefreshProps extends ScrollViewProps {
    onRefresh?: () => Promise<void> | void;
    refreshing: boolean;
    children: ReactNode;
    hapticType?: HapticFeedbackTypes;
}

const HapticPullToRefresh: React.FC<HapticPullToRefreshProps> = ({
                                                                     onRefresh,
                                                                     refreshing,
                                                                     children,
                                                                     hapticType = HapticFeedbackTypes.impactMedium,
                                                                     ...scrollViewProps
                                                                 }) => {
    const handleRefresh = async () => {
        // Лёгкий тактильный отклик
        ReactNativeHapticFeedback.trigger(hapticType, {
            enableVibrateFallback: true,
            ignoreAndroidSystemSettings: false
        });

        if (onRefresh) {
            await onRefresh();
        }
    };

    return (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            {...scrollViewProps}
        >
            {children}
        </ScrollView>
    );
};

export default HapticPullToRefresh;