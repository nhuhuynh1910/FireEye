/* components/PTZController.jsx - Mobile Native Version */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSystem } from '../store/SystemContext';
import { api } from '../services/api';
import { colors } from '../theme/colors';

export const PTZController = () => {
    const { activeCameraId, isCameraOnline, autoScanActive } = useSystem();

    const cameraNames = {
        1: "Front Gate",
        2: "Parking Lot",
        3: "Lobby",
        4: "Back Door"
    };
    
    const activeName = cameraNames[activeCameraId] || "Camera";
    const isControllable = activeCameraId === 1 && isCameraOnline && !autoScanActive;

    const handlePTZStart = async (action) => {
        if (!isControllable) return;
        try {
            await api.sendPTZCommand(action);
        } catch (err) {
            console.error(`PTZ ${action} start error:`, err);
        }
    };

    const handlePTZStop = async (action) => {
        if (!isControllable) return;
        try {
            await api.sendPTZCommand('stop', { code: action });
        } catch (err) {
            console.error("PTZ stop error:", err);
        }
    };

    const handleStopClick = async () => {
        if (!isControllable) return;
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
                pressed && styles.dpadBtnPressed,
                !isControllable && styles.disabledBtn
            ]}
            onPressIn={() => handlePTZStart(action)}
            onPressOut={() => handlePTZStop(action)}
            disabled={!isControllable}
        >
            <Text style={[styles.dpadText, !isControllable && styles.disabledText]}>{symbol}</Text>
        </Pressable>
    );

    return (
        <View style={[styles.card, !isControllable && styles.lockedCard]}>
            {/* HUD Corner Accents */}
            <View style={[styles.hudCorner, styles.hudTL]} />
            <View style={[styles.hudCorner, styles.hudTR]} />
            <View style={[styles.hudCorner, styles.hudBL]} />
            <View style={[styles.hudCorner, styles.hudBR]} />

            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>PTZ CONTROLLER // {activeName.toUpperCase()}</Text>
                    <View style={[styles.badge, isControllable ? styles.badgeActive : styles.badgeLocked]}>
                        <Text style={styles.badgeText}>{isControllable ? "SDK ACTIVE" : "LOCKED"}</Text>
                    </View>
                </View>
                <Text style={styles.sub}>
                    {isControllable ? "DAHUA CORES SYSTEM // COMMAND MODE" : "SIMULATION LOCKED OR AUTO-SCANNING"}
                </Text>
            </View>
            
            <View style={styles.body}>
                {/* Sleek D-PAD */}
                <View style={[styles.dpadContainer, !isControllable && styles.disabledDpad]}>
                    {renderDirectionBtn("up", "up", "▲")}
                    {renderDirectionBtn("left", "left", "◀")}
                    
                    <Pressable
                        style={({ pressed }) => [
                            styles.dpadCenter,
                            pressed && styles.dpadCenterPressed,
                            !isControllable && styles.disabledBtn
                        ]}
                        onPress={handleStopClick}
                        disabled={!isControllable}
                    >
                        <View style={[styles.stopDot, !isControllable && styles.disabledStopDot]} />
                    </Pressable>
                    
                    {renderDirectionBtn("right", "right", "▶")}
                    {renderDirectionBtn("down", "down", "▼")}
                </View>
                
                {/* ZOOM HUD Controls */}
                <View style={styles.zoomContainer}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.zoomBtn,
                            pressed && styles.zoomBtnPressed,
                            !isControllable && styles.disabledBtn
                        ]}
                        onPressIn={() => handlePTZStart('zoom-in')}
                        onPressOut={() => handlePTZStop('zoom-in')}
                        disabled={!isControllable}
                    >
                        <Text style={[styles.zoomText, !isControllable && styles.disabledText]}>ZOOM +</Text>
                    </Pressable>
                    
                    <Pressable
                        style={({ pressed }) => [
                            styles.zoomBtn,
                            pressed && styles.zoomBtnPressed,
                            !isControllable && styles.disabledBtn
                        ]}
                        onPressIn={() => handlePTZStart('zoom-out')}
                        onPressOut={() => handlePTZStop('zoom-out')}
                        disabled={!isControllable}
                    >
                        <Text style={[styles.zoomText, !isControllable && styles.disabledText]}>ZOOM -</Text>
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
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 16,
        marginVertical: 10,
        position: 'relative',
        shadowColor: colors.accentCyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    lockedCard: {
        opacity: 0.55,
        borderColor: 'rgba(255, 94, 54, 0.1)',
    },
    header: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 94, 54, 0.08)',
        paddingBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.textPrimary,
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    sub: {
        fontSize: 8,
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
    },
    badgeActive: {
        backgroundColor: 'rgba(255, 94, 54, 0.08)',
        borderColor: colors.accentCyan,
    },
    badgeLocked: {
        backgroundColor: 'rgba(255, 59, 48, 0.08)',
        borderColor: colors.accentRed,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '900',
        fontFamily: 'monospace',
        color: colors.textPrimary,
    },
    body: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    dpadContainer: {
        position: 'relative',
        width: 120,
        height: 120,
        backgroundColor: '#03060d',
        borderRadius: 60,
        borderWidth: 1.5,
        borderColor: colors.borderColor,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledDpad: {
        borderColor: 'rgba(255, 94, 54, 0.08)',
    },
    dpadBtn: {
        position: 'absolute',
        width: 38,
        height: 38,
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dpadBtnPressed: {
        backgroundColor: colors.bgCardHover,
        borderColor: colors.accentCyan,
        shadowColor: colors.accentCyan,
        shadowRadius: 5,
        shadowOpacity: 0.5,
    },
    up: {
        top: 4,
        borderBottomWidth: 0,
        borderBottomLeftRadius: 1,
        borderBottomRightRadius: 1,
    },
    down: {
        bottom: 4,
        borderTopWidth: 0,
        borderTopLeftRadius: 1,
        borderTopRightRadius: 1,
    },
    left: {
        left: 4,
        borderRightWidth: 0,
        borderTopRightRadius: 1,
        borderBottomRightRadius: 1,
    },
    right: {
        right: 4,
        borderLeftWidth: 0,
        borderTopLeftRadius: 1,
        borderBottomLeftRadius: 1,
    },
    dpadText: {
        fontSize: 14,
        color: colors.accentCyan,
        fontWeight: 'bold',
    },
    dpadCenter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        borderWidth: 1,
        borderColor: colors.accentRed,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dpadCenterPressed: {
        backgroundColor: colors.accentRed,
    },
    stopDot: {
        width: 8,
        height: 8,
        backgroundColor: colors.accentRed,
        borderRadius: 1.5,
    },
    zoomContainer: {
        flex: 1,
        marginLeft: 28,
        gap: 12,
    },
    zoomBtn: {
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    zoomBtnPressed: {
        borderColor: colors.accentCyan,
        backgroundColor: colors.bgCardHover,
    },
    zoomText: {
        color: colors.accentCyan,
        fontSize: 10,
        fontWeight: '900',
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    disabledBtn: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    disabledText: {
        color: colors.textMuted,
    },
    disabledStopDot: {
        backgroundColor: colors.textMuted,
    },
    // Sci-Fi corner lines
    hudCorner: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderColor: colors.borderColor,
    },
    hudTL: {
        top: -1,
        left: -1,
        borderTopWidth: 2,
        borderLeftWidth: 2,
    },
    hudTR: {
        top: -1,
        right: -1,
        borderTopWidth: 2,
        borderRightWidth: 2,
    },
    hudBL: {
        bottom: -1,
        left: -1,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
    },
    hudBR: {
        bottom: -1,
        right: -1,
        borderBottomWidth: 2,
        borderRightWidth: 2,
    },
});
