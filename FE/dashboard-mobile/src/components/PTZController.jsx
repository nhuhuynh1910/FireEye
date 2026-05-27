/* components/PTZController.jsx - Mobile Native Version */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';
import { colors } from '../theme/colors';

export const PTZController = () => {
    const { activeCameraId, isCameraOnline } = useSystem();

    const cameraNames = {
        1: "Front Gate",
        2: "Parking Lot",
        3: "Lobby",
        4: "Back Door"
    };
    
    const activeName = cameraNames[activeCameraId] || "Camera";

    const handlePTZStart = async (action) => {
        if (activeCameraId !== 1 || !isCameraOnline) return;
        try {
            await api.sendPTZCommand(action);
        } catch (err) {
            console.error(`PTZ ${action} start error:`, err);
        }
    };

    const handlePTZStop = async (action) => {
        if (activeCameraId !== 1 || !isCameraOnline) return;
        try {
            await api.sendPTZCommand('stop', { code: action });
        } catch (err) {
            console.error("PTZ stop error:", err);
        }
    };

    const handleStopClick = async () => {
        if (activeCameraId !== 1 || !isCameraOnline) return;
        try {
            await api.sendPTZCommand('stop');
        } catch (err) {
            console.error("PTZ hard stop error:", err);
        }
    };

    const renderDirectionBtn = (direction, action, symbol) => (
        <Pressable
            style={({ pressed }) => [
                styles.dpadBtn,
                styles[direction],
                pressed && styles.dpadBtnPressed
            ]}
            onPressIn={() => handlePTZStart(action)}
            onPressOut={() => handlePTZStop(action)}
        >
            <Text style={styles.dpadText}>{symbol}</Text>
        </Pressable>
    );

    const isControllable = activeCameraId === 1 && isCameraOnline;

    return (
        <View style={[styles.card, { opacity: isControllable ? 1 : 0.6 }]}>
            <View style={styles.header}>
                <Text style={styles.title}>PTZ Controller ({activeName})</Text>
                <Text style={styles.sub}>
                    {isControllable ? "Dahua SDK Command Mode" : "Simulation Mode (Locked)"}
                </Text>
            </View>
            
            <View style={styles.body}>
                {/* D-PAD */}
                <View style={styles.dpadContainer}>
                    {renderDirectionBtn("up", "up", "▲")}
                    {renderDirectionBtn("left", "left", "◀")}
                    
                    <Pressable
                        style={({ pressed }) => [
                            styles.dpadCenter,
                            pressed && styles.dpadCenterPressed
                        ]}
                        onPress={handleStopClick}
                    >
                        <View style={styles.stopDot} />
                    </Pressable>
                    
                    {renderDirectionBtn("right", "right", "▶")}
                    {renderDirectionBtn("down", "down", "▼")}
                </View>
                
                {/* ZOOM */}
                <View style={styles.zoomContainer}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.zoomBtn,
                            pressed && styles.zoomBtnPressed
                        ]}
                        onPressIn={() => handlePTZStart('zoom-in')}
                        onPressOut={() => handlePTZStop('zoom-in')}
                    >
                        <Text style={styles.zoomText}>ZOOM +</Text>
                    </Pressable>
                    
                    <Pressable
                        style={({ pressed }) => [
                            styles.zoomBtn,
                            pressed && styles.zoomBtnPressed
                        ]}
                        onPressIn={() => handlePTZStart('zoom-out')}
                        onPressOut={() => handlePTZStop('zoom-out')}
                    >
                        <Text style={styles.zoomText}>ZOOM -</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
    },
    header: {
        marginBottom: 12,
    },
    title: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    sub: {
        fontSize: 9,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    body: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dpadContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        backgroundColor: colors.bgDeep,
        borderRadius: 60,
        borderWidth: 1,
        borderColor: colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dpadBtn: {
        position: 'absolute',
        width: 36,
        height: 36,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dpadBtnPressed: {
        backgroundColor: colors.bgCardHover,
        borderColor: colors.accentCyan,
    },
    up: {
        top: 6,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },
    down: {
        bottom: 6,
        borderTopLeftRadius: 2,
        borderTopRightRadius: 2,
    },
    left: {
        left: 6,
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
    right: {
        right: 6,
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
    },
    dpadText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    dpadCenter: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dpadCenterPressed: {
        backgroundColor: colors.accentRed,
        borderColor: colors.accentRed,
    },
    stopDot: {
        width: 8,
        height: 8,
        backgroundColor: colors.textSecondary,
        borderRadius: 1,
    },
    zoomContainer: {
        flex: 1,
        marginLeft: 24,
        gap: 10,
    },
    zoomBtn: {
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomBtnPressed: {
        borderColor: colors.accentCyan,
        backgroundColor: colors.bgCardHover,
    },
    zoomText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
