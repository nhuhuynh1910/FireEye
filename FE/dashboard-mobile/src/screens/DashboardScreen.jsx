/* screens/DashboardScreen.jsx - Mobile Native Version */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    Pressable, 
    ScrollView, 
    TextInput, 
    Modal, 
    Animated, 
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { useSystem } from '../store/SystemContext';
import { PTZController } from '../components/PTZController';
import { formatTimestamp } from '../utils/helpers';
import { colors } from '../theme/colors';
import { api } from '../services/api';
import logoImg from '../../assets/logo.jpg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DashboardScreen = () => {
    const {
        activeTab,
        setActiveTab,
        activeCameraId,
        setActiveCameraId,
        isBackendConnected,
        isCameraOnline,
        raspberryPiIp,
        setRaspberryPiIp,
        npuLoad,
        systemTemp,
        sprinklerState,
        overallAlertLevel,
        smokeValue,
        flameValue,
        smokeDetected,
        flameDetected,
        sensorNode,
        aiFireDetected,
        aiSmokeDetected,
        aiHumanDetected,
        aiConfidence,
        aiBbox,
        hailoStatus,
        events,
        fetchEvents,
        toggleSprinkler,
        triggerEmergencyStop,
        autoScanActive,
        setAutoScanActive,
        notifications,
        unreadCount,
        markAsRead,
        faceWatchActive,
        toggleFaceWatch,
        mqttConnected
    } = useSystem();

    // Local state variables
    const [ipInput, setIpInput] = useState(raspberryPiIp);
    const [showNotifications, setShowNotifications] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [eventLogs, setEventLogs] = useState([]);
    const [isRefreshingEvents, setIsRefreshingEvents] = useState(false);

    // Settings local simulator states
    const [simSmoke, setSimSmoke] = useState(12);
    const [simFlame, setSimFlame] = useState(8);
    const [simSmokeDetected, setSimSmokeDetected] = useState(false);
    const [simFlameDetected, setSimFlameDetected] = useState(false);
    const [simNode, setSimNode] = useState("Node-01");
    const [isUpdatingSensors, setIsUpdatingSensors] = useState(false);

    const [simAiFire, setSimAiFire] = useState(false);
    const [simAiSmoke, setSimAiSmoke] = useState(false);
    const [simAiHuman, setSimAiHuman] = useState(false);
    const [simAiConfidence, setSimAiConfidence] = useState(0.85);
    const [isTriggeringAI, setIsTriggeringAI] = useState(false);

    // AI Bbox adjustments
    const [simBboxX, setSimBboxX] = useState(408);
    const [simBboxY, setSimBboxY] = useState(218);
    const [simBboxW, setSimBboxW] = useState(180);
    const [simBboxH, setSimBboxH] = useState(170);

    // Scanner beam animation
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, {
                    toValue: 1,
                    duration: 4000,
                    useNativeDriver: false,
                }),
                Animated.timing(scanAnim, {
                    toValue: 0,
                    duration: 4000,
                    useNativeDriver: false,
                })
            ])
        ).start();
    }, [scanAnim]);

    const scanLineTop = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    // Sync input box when context IP updates
    useEffect(() => {
        setIpInput(raspberryPiIp);
    }, [raspberryPiIp]);

    // Local Event Logs Loading
    const loadEventLogs = async (silent = false) => {
        if (!silent) setIsRefreshingEvents(true);
        try {
            const res = await api.getEvents(50);
            if (res.status === "success") {
                setEventLogs(res.data);
            }
        } catch (err) {
            console.error("Failed to load events in mobile:", err);
        } finally {
            if (!silent) setIsRefreshingEvents(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'events') {
            loadEventLogs(false);
        }
    }, [activeTab]);

    // Bounding Box layout calculations
    const showLive = isBackendConnected && isCameraOnline && activeCameraId === 1;
    const isAlerting = overallAlertLevel !== "safe" || aiFireDetected || aiSmokeDetected || aiHumanDetected || flameDetected || smokeDetected;

    const hasBbox = aiBbox && aiBbox.length === 4;
    const boxLeft = hasBbox ? (aiBbox[0] / 960) * 100 : 0;
    const boxTop = hasBbox ? (aiBbox[1] / 540) * 100 : 0;
    const boxWidth = hasBbox ? ((aiBbox[2] - aiBbox[0]) / 960) * 100 : 0;
    const boxHeight = hasBbox ? ((aiBbox[3] - aiBbox[1]) / 540) * 100 : 0;

    let targetClass = "SAFE";
    let boxColor = colors.accentCyan;
    if (aiFireDetected) {
        targetClass = "FIRE";
        boxColor = colors.accentRed;
    } else if (aiSmokeDetected) {
        targetClass = "SMOKE";
        boxColor = colors.accentYellow;
    } else if (aiHumanDetected) {
        targetClass = "HUMAN";
        boxColor = colors.accentCyan;
    }

    // Handlers for settings simulator
    const handleUpdateSensors = async () => {
        setIsUpdatingSensors(true);
        try {
            await api.updateSensors({
                smokeDetected: simSmokeDetected,
                flameDetected: simFlameDetected,
                smokeValue: simSmoke,
                flameValue: simFlame,
                node: simNode
            });
            alert("IoT Sensor status synchronized with FastAPI!");
            fetchEvents();
        } catch (err) {
            console.error(err);
            alert("Connection error to backend.");
        } finally {
            setIsUpdatingSensors(false);
        }
    };

    const handleTriggerAIDetect = async () => {
        setIsTriggeringAI(true);
        try {
            const hasDetect = simAiFire || simAiSmoke || simAiHuman;
            const res = await api.triggerAIDetect({
                fire: simAiFire,
                smoke: simAiSmoke,
                human: simAiHuman,
                confidence: parseFloat(simAiConfidence),
                bbox: hasDetect ? [simBboxX, simBboxY, simBboxX + simBboxW, simBboxY + simBboxH] : null
            });
            alert(`AI Analysis trigger: ${res.risk_level} state registered.`);
            fetchEvents();
        } catch (err) {
            console.error(err);
            alert("Connection error to backend.");
        } finally {
            setIsTriggeringAI(false);
        }
    };

    const handleResetAll = async () => {
        setIsUpdatingSensors(true);
        setIsTriggeringAI(true);
        try {
            await api.updateSensors({
                smokeDetected: false,
                flameDetected: false,
                smokeValue: 12,
                flameValue: 5,
                node: simNode
            });
            await api.triggerAIDetect({
                fire: false,
                smoke: false,
                human: false,
                confidence: 0.0,
                bbox: null
            });
            setSimSmoke(12);
            setSimFlame(5);
            setSimSmokeDetected(false);
            setSimFlameDetected(false);
            setSimAiFire(false);
            setSimAiSmoke(false);
            setSimAiHuman(false);
            setSimAiConfidence(0.0);
            setSimBboxX(408);
            setSimBboxY(218);
            setSimBboxW(180);
            setSimBboxH(170);
            alert("All simulated inputs set back to SAFE states.");
            fetchEvents();
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdatingSensors(false);
            setIsTriggeringAI(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* TOP BAR */}
            <View style={styles.navbar}>
                <View style={styles.brandRow}>
                    <Image source={logoImg} style={styles.logoImage} />
                    <View>
                        <Text style={styles.brandTitle}>FireEye AI System</Text>
                        <Text style={styles.brandSubtitle}>POWERED BY AI</Text>
                    </View>
                </View>

                <View style={styles.navbarControls}>
                    {/* Notification Bell with Badge */}
                    <Pressable 
                        style={styles.bellButton}
                        onPress={() => setShowNotifications(true)}
                    >
                        <Text style={styles.bellIcon}>🔔</Text>
                        {unreadCount > 0 && (
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeCountText}>{unreadCount}</Text>
                            </View>
                        )}
                    </Pressable>

                    {/* Status indicator */}
                    <View style={styles.sysTelemetryPill}>
                        <View style={[styles.dot, isBackendConnected ? styles.dotGreen : styles.dotRed]} />
                        <Text style={styles.statusText}>{isBackendConnected ? "ONLINE" : "OFFLINE"}</Text>
                    </View>

                    {/* Emergency Stop */}
                    <Pressable 
                        style={styles.btnEmergency}
                        onPress={triggerEmergencyStop}
                    >
                        <Text style={styles.btnEmergencyText}>EMERGENCY STOP</Text>
                    </Pressable>
                </View>
            </View>

            {/* TAB SELECTOR */}
            <View style={styles.tabBar}>
                {['dashboard', 'events', 'settings'].map(tab => (
                    <Pressable
                        key={tab}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab.toUpperCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* MAIN RENDER WINDOW */}
            {activeTab === 'dashboard' && (
                <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                    {/* SYSTEM STATUS TELEMETRY BANNER */}
                    <View style={styles.systemStatsBanner}>
                        <View style={styles.statBannerItem}>
                            <Text style={styles.statBannerLabel}>SYS LOAD</Text>
                            <Text style={[styles.statBannerValue, { color: isBackendConnected ? colors.accentGreen : colors.accentRed }]}>
                                {isBackendConnected ? "ONLINE" : "OFFLINE"}
                            </Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBannerItem}>
                            <Text style={styles.statBannerLabel}>NPU COMPUTE</Text>
                            <Text style={styles.statBannerValue}>{npuLoad.toFixed(0)}%</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBannerItem}>
                            <Text style={styles.statBannerLabel}>CORE TEMP</Text>
                            <Text style={styles.statBannerValue}>{systemTemp.toFixed(1)}°C</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBannerItem}>
                            <Text style={styles.statBannerLabel}>AI CORE</Text>
                            <Text style={styles.statBannerValue}>HAILO-8L</Text>
                        </View>
                    </View>

                    {/* CAMERA STAGE VIEWPORT (16:9) */}
                    <View style={[styles.videoStageCard, isAlerting && showLive && styles.videoStageCardAlert]}>
                        <View style={styles.videoStage}>
                            {showLive ? (
                                <View style={styles.liveStreamWrapper}>
                                    <Image
                                        source={{ uri: `${api.getStreamUrl()}?t=${Date.now()}` }}
                                        style={styles.streamFeedImage}
                                        resizeMode="contain"
                                    />
                                    {/* YOLOv8 VISION HUD OVERLAY */}
                                    <View style={styles.hudOverlay} pointerEvents="none">
                                        {/* Bounding Box Drawing */}
                                        {hasBbox && (
                                            <View
                                                style={[
                                                    styles.hudTargetBox,
                                                    {
                                                        left: `${boxLeft}%`,
                                                        top: `${boxTop}%`,
                                                        width: `${boxWidth}%`,
                                                        height: `${boxHeight}%`,
                                                        borderColor: boxColor,
                                                    }
                                                ]}
                                            >
                                                <View style={[styles.hudTargetLabel, { backgroundColor: boxColor }]}>
                                                    <View style={styles.hudAlertDot} />
                                                    <Text style={styles.hudTargetText}>
                                                        {targetClass}: {(aiConfidence * 100).toFixed(0)}%
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Corner Brackets */}
                                        <View style={[styles.bracket, styles.bracketTL]} />
                                        <View style={[styles.bracket, styles.bracketTR]} />
                                        <View style={[styles.bracket, styles.bracketBL]} />
                                        <View style={[styles.bracket, styles.bracketBR]} />

                                        {/* Telemetry info HUD overlay */}
                                        <View style={styles.hudTelemetryHeader}>
                                            <Text style={styles.hudTelemetryText}>DEV_CLASS: PI_5</Text>
                                            <Text style={[styles.hudTelemetryText, isAlerting && styles.hudTelemetryAlertText]}>
                                                {isAlerting ? "ALARM: ACTIVE" : "STATUS: SECURE"}
                                            </Text>
                                        </View>
                                        
                                        <View style={styles.hudTelemetryFooter}>
                                            <Text style={styles.hudTelemetryText}>ACCEL: HAILO-8L ({hailoStatus.toUpperCase()})</Text>
                                            <Text style={styles.hudTelemetryText}>FLOW: YOLOv8</Text>
                                        </View>

                                        {/* Scanner beam animation */}
                                        <Animated.View style={[styles.scannerLine, isAlerting && styles.scannerLineDanger, { top: scanLineTop }]} />

                                        {/* Crosshair */}
                                        <View style={styles.crosshair}>
                                            <View style={styles.crosshairCircle} />
                                            <View style={styles.crosshairH} />
                                            <View style={styles.crosshairV} />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.offlineFeed}>
                                    <View style={styles.offlineDotPulse} />
                                    <Text style={styles.offlineText}>CAMERA OFFLINE // SIM MODE</Text>
                                    <Text style={styles.offlineTelemetryText}>RTSP STREAM NOT ATTACHED</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* CAMERA SELECT PANEL (Horizontal Scroll) */}
                    <View style={styles.cameraRoster}>
                        {['Front Gate', 'Parking Lot', 'Lobby', 'Back Door'].map((name, idx) => {
                            const cid = idx + 1;
                            const isAct = activeCameraId === cid;
                            return (
                                <Pressable
                                    key={name}
                                    style={[styles.cameraThumbnailCard, isAct && styles.cameraThumbnailActive]}
                                    onPress={() => setActiveCameraId(cid)}
                                >
                                    <Text style={[styles.cameraThumbLabel, isAct && styles.cameraThumbLabelActive]}>
                                        CAM 0{cid}
                                    </Text>
                                    <Text style={styles.cameraThumbName}>{name}</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* PTZ CONTROLLER */}
                    <PTZController />

                    {/* CAMERA PATROL / AUTO-SCAN MODULE */}
                    <View style={styles.patrolCard}>
                        <Text style={styles.patrolTitle}>CAMERA PATROL NODE</Text>
                        <View style={styles.patrolRow}>
                            <Text style={styles.patrolDesc}>
                                Sequential zone patrol scanning (Zones 1-4)
                            </Text>
                            <Pressable 
                                style={[styles.toggleBtn, autoScanActive ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={() => setAutoScanActive(!autoScanActive)}
                            >
                                <Text style={styles.toggleBtnText}>
                                    {autoScanActive ? "ACTIVE" : "STANDBY"}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* ZONE STATUS MONITOR */}
                    <View style={styles.zonesMonitorCard}>
                        <Text style={styles.sectionTitle}>ZONE SECURITY MONITOR</Text>
                        
                        {/* Zone 1 */}
                        <View style={[styles.zoneCard, isAlerting && styles.zoneCardAlert]}>
                            <View style={styles.zoneHeader}>
                                <View>
                                    <Text style={styles.zoneName}>Zone 01: Warehouse North</Text>
                                    <Text style={styles.zoneDesc}>Main Storage Sector</Text>
                                </View>
                                <View style={[styles.zoneBadge, isAlerting ? styles.zoneBadgeAlert : styles.zoneBadgeSafe]}>
                                    <Text style={styles.zoneBadgeText}>{isAlerting ? "ALARM" : "SAFE"}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.zoneTelemetryRow}>
                                <View style={styles.zoneTelemetryPill}>
                                    <Text style={styles.zonePillLabel}>FLAME LEVEL</Text>
                                    <Text style={styles.zonePillValue}>{flameValue}%</Text>
                                </View>
                                <View style={styles.zoneTelemetryPill}>
                                    <Text style={styles.zonePillLabel}>SMOKE VALUE</Text>
                                    <Text style={styles.zonePillValue}>{smokeValue} ppm</Text>
                                </View>
                            </View>

                            <Pressable 
                                style={[styles.btnSprinkler, sprinklerState === "ON" && styles.btnSprinklerActive]}
                                onPress={toggleSprinkler}
                            >
                                <Text style={styles.btnSprinklerText}>
                                    {sprinklerState === "ON" ? "PUMP MOTOR ACTIVE" : "PUMP SHUTOFF"}
                                </Text>
                            </Pressable>
                        </View>

                        {/* Zone 2 */}
                        <View style={[styles.zoneCard, styles.zoneCardNormal]}>
                            <View style={styles.zoneHeader}>
                                <View>
                                    <Text style={styles.zoneName}>Zone 02: Loading Dock</Text>
                                    <Text style={styles.zoneDesc}>Cargo Bays A-F</Text>
                                </View>
                                <View style={[styles.zoneBadge, styles.zoneBadgeSafe]}>
                                    <Text style={styles.zoneBadgeText}>SAFE</Text>
                                </View>
                            </View>
                            <View style={styles.zoneTelemetryRow}>
                                <View style={styles.zoneTelemetryPill}>
                                    <Text style={styles.zonePillLabel}>FLAME LEVEL</Text>
                                    <Text style={styles.zonePillValue}>0%</Text>
                                </View>
                                <View style={styles.zoneTelemetryPill}>
                                    <Text style={styles.zonePillLabel}>SMOKE VALUE</Text>
                                    <Text style={styles.zonePillValue}>12 ppm</Text>
                                </View>
                            </View>
                        </View>

                        {/* Zone 3 */}
                        <View style={[styles.zoneCard, styles.zoneCardNormal]}>
                            <View style={styles.zoneHeader}>
                                <View>
                                    <Text style={styles.zoneName}>Zone 03: Office Suite</Text>
                                    <Text style={styles.zoneDesc}>Administrative Wing</Text>
                                </View>
                                <View style={[styles.zoneBadge, styles.zoneBadgeSafe]}>
                                    <Text style={styles.zoneBadgeText}>SAFE</Text>
                                </View>
                            </View>
                            <View style={styles.zoneTelemetryRow}>
                                <View style={styles.zoneTelemetryPill}>
                                    <Text style={styles.zonePillLabel}>FLAME LEVEL</Text>
                                    <Text style={styles.zonePillValue}>0%</Text>
                                </View>
                                <View style={styles.zoneTelemetryPill}>
                                    <Text style={styles.zonePillLabel}>SMOKE VALUE</Text>
                                    <Text style={styles.zonePillValue}>8 ppm</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            )}

            {activeTab === 'events' && (
                <View style={styles.subScreenContainer}>
                    <View style={styles.subScreenHeader}>
                        <Text style={styles.subScreenTitle}>SECURITY EVENT JOURNAL</Text>
                        <Pressable 
                            style={styles.refreshBtn}
                            onPress={() => loadEventLogs(false)}
                            disabled={isRefreshingEvents}
                        >
                            {isRefreshingEvents ? (
                                <ActivityIndicator size="small" color={colors.accentCyan} />
                            ) : (
                                <Text style={styles.refreshBtnText}>REFRESH</Text>
                            )}
                        </Pressable>
                    </View>

                    {isRefreshingEvents && eventLogs.length === 0 ? (
                        <View style={styles.loadingWrapper}>
                            <ActivityIndicator size="large" color={colors.accentCyan} />
                            <Text style={styles.loadingText}>QUERYING SQL SECURE DATABASE...</Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.logsList}>
                            {eventLogs.map((item) => (
                                <Pressable 
                                    key={item.id} 
                                    style={styles.logCard}
                                    onPress={() => setSelectedEvent(item)}
                                >
                                    <View style={styles.logCardTop}>
                                        <Text style={styles.logId}>#{item.id}</Text>
                                        <Text style={styles.logTime}>
                                            {item.created_at?.replace('T', ' ').substring(11, 19)}
                                        </Text>
                                        <View style={[
                                            styles.logRiskBadge,
                                            item.risk_level === 'CRITICAL' || item.risk_level === 'HIGH' || item.risk_level === 'EMERGENCY'
                                                ? styles.logRiskAlert : styles.logRiskSafe
                                        ]}>
                                            <Text style={styles.logRiskText}>{item.risk_level}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.logMessage}>{item.message}</Text>
                                    <View style={styles.logCardBottom}>
                                        <Text style={styles.logMeta}>SRC: {item.source}</Text>
                                        {item.snapshot_path ? (
                                            <Text style={styles.viewFrameText}>VIEW IMAGE SNAPSHOT</Text>
                                        ) : (
                                            <Text style={styles.noMediaText}>NO MEDIA</Text>
                                        )}
                                    </View>
                                </Pressable>
                            ))}
                            {eventLogs.length === 0 && (
                                <Text style={styles.emptyLogsText}>
                                    No threat logs found in database. System secure.
                                </Text>
                            )}
                        </ScrollView>
                    )}
                </View>
            )}

            {activeTab === 'settings' && (
                <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                    {/* PI BACKEND CONNECTIONS IP */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>RASPBERRY PI IP CONFIG</Text>
                        <Text style={styles.settingsDesc}>Specify IP address of backend host</Text>
                        <View style={styles.ipConfigRow}>
                            <TextInput 
                                style={styles.ipInput}
                                value={ipInput}
                                onChangeText={setIpInput}
                                placeholder="e.g. 192.168.1.100"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numeric"
                            />
                            <Pressable 
                                style={styles.ipSaveBtn}
                                onPress={() => {
                                    setRaspberryPiIp(ipInput);
                                    alert("Backend endpoint configured.");
                                }}
                            >
                                <Text style={styles.ipSaveBtnText}>SAVE</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* IoT SENSORS HARDWARE SIMULATOR */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>IoT HARDWARE EMULATOR</Text>

                        {/* Node ID */}
                        <Text style={styles.fieldLabel}>NODE IDENTIFIER</Text>
                        <TextInput 
                            style={styles.textField}
                            value={simNode}
                            onChangeText={setSimNode}
                        />

                        {/* Smoke level Adjuster */}
                        <Text style={styles.fieldLabel}>SMOKE LEVEL: {simSmoke} ppm</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimSmoke(Math.max(0, simSmoke - 20))}>
                                <Text style={styles.adjusterBtnText}>-20</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimSmoke(Math.max(0, simSmoke - 1))}>
                                <Text style={styles.adjusterBtnText}>-1</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimSmoke(Math.min(800, simSmoke + 1))}>
                                <Text style={styles.adjusterBtnText}>+1</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimSmoke(Math.min(800, simSmoke + 20))}>
                                <Text style={styles.adjusterBtnText}>+20</Text>
                            </Pressable>
                        </View>

                        {/* Flame spectrum Adjuster */}
                        <Text style={styles.fieldLabel}>FLAME LEVEL: {simFlame}%</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimFlame(Math.max(0, simFlame - 10))}>
                                <Text style={styles.adjusterBtnText}>-10</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimFlame(Math.max(0, simFlame - 1))}>
                                <Text style={styles.adjusterBtnText}>-1</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimFlame(Math.min(100, simFlame + 1))}>
                                <Text style={styles.adjusterBtnText}>+1</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimFlame(Math.min(100, simFlame + 10))}>
                                <Text style={styles.adjusterBtnText}>+10</Text>
                            </Pressable>
                        </View>

                        {/* Alarms switches */}
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>SMOKE ALARM THRESHOLD</Text>
                            <Pressable 
                                style={[styles.toggleBtn, simSmokeDetected ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={() => setSimSmokeDetected(!simSmokeDetected)}
                            >
                                <Text style={styles.toggleBtnText}>{simSmokeDetected ? "ALARM" : "SAFE"}</Text>
                            </Pressable>
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>FLAME ALARM THRESHOLD</Text>
                            <Pressable 
                                style={[styles.toggleBtn, simFlameDetected ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={() => setSimFlameDetected(!simFlameDetected)}
                            >
                                <Text style={styles.toggleBtnText}>{simFlameDetected ? "ALARM" : "SAFE"}</Text>
                            </Pressable>
                        </View>

                        <Pressable 
                            style={styles.submitBtn}
                            onPress={handleUpdateSensors}
                            disabled={isUpdatingSensors}
                        >
                            {isUpdatingSensors ? (
                                <ActivityIndicator size="small" color={colors.bgDeep} />
                            ) : (
                                <Text style={styles.submitBtnText}>SYNC HARDWARE STATE</Text>
                            )}
                        </Pressable>
                    </View>

                    {/* YOLOv8 AI CORE INJECTOR */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>YOLOv8 AI CORE INJECTOR</Text>

                        {/* Targets selection */}
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>FIRE DETECTED</Text>
                            <Pressable 
                                style={[styles.toggleBtn, simAiFire ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={() => setSimAiFire(!simAiFire)}
                            >
                                <Text style={styles.toggleBtnText}>{simAiFire ? "DETECTED" : "CLEAR"}</Text>
                            </Pressable>
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>SMOKE CLOUD DETECTED</Text>
                            <Pressable 
                                style={[styles.toggleBtn, simAiSmoke ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={() => setSimAiSmoke(!simAiSmoke)}
                            >
                                <Text style={styles.toggleBtnText}>{simAiSmoke ? "DETECTED" : "CLEAR"}</Text>
                            </Pressable>
                        </View>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>HUMAN DETECTED</Text>
                            <Pressable 
                                style={[styles.toggleBtn, simAiHuman ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={() => setSimAiHuman(!simAiHuman)}
                            >
                                <Text style={styles.toggleBtnText}>{simAiHuman ? "DETECTED" : "CLEAR"}</Text>
                            </Pressable>
                        </View>

                        {/* Confidence score Adjuster */}
                        <Text style={styles.fieldLabel}>CONFIDENCE SCORE: {(simAiConfidence * 100).toFixed(0)}%</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimAiConfidence(Math.max(0, simAiConfidence - 0.05))}>
                                <Text style={styles.adjusterBtnText}>-5%</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimAiConfidence(Math.max(0, simAiConfidence - 0.01))}>
                                <Text style={styles.adjusterBtnText}>-1%</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimAiConfidence(Math.min(1.0, simAiConfidence + 0.01))}>
                                <Text style={styles.adjusterBtnText}>+1%</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimAiConfidence(Math.min(1.0, simAiConfidence + 0.05))}>
                                <Text style={styles.adjusterBtnText}>+5%</Text>
                            </Pressable>
                        </View>

                        {/* Bbox coordinates adjuster */}
                        <Text style={styles.fieldLabel}>BBOX ADJUSTERS (960x540 Frame)</Text>
                        
                        <Text style={styles.subFieldLabel}>LEFT (X): {simBboxX}px</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxX(Math.max(0, simBboxX - 50))}>
                                <Text style={styles.adjusterBtnText}>-50</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxX(Math.max(0, simBboxX - 5))}>
                                <Text style={styles.adjusterBtnText}>-5</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxX(Math.min(960, simBboxX + 5))}>
                                <Text style={styles.adjusterBtnText}>+5</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxX(Math.min(960, simBboxX + 50))}>
                                <Text style={styles.adjusterBtnText}>+50</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subFieldLabel}>TOP (Y): {simBboxY}px</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxY(Math.max(0, simBboxY - 50))}>
                                <Text style={styles.adjusterBtnText}>-50</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxY(Math.max(0, simBboxY - 5))}>
                                <Text style={styles.adjusterBtnText}>-5</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxY(Math.min(540, simBboxY + 5))}>
                                <Text style={styles.adjusterBtnText}>+5</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxY(Math.min(540, simBboxY + 50))}>
                                <Text style={styles.adjusterBtnText}>+50</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subFieldLabel}>WIDTH: {simBboxW}px</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxW(Math.max(20, simBboxW - 10))}>
                                <Text style={styles.adjusterBtnText}>-10</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxW(Math.min(500, simBboxW + 10))}>
                                <Text style={styles.adjusterBtnText}>+10</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.subFieldLabel}>HEIGHT: {simBboxH}px</Text>
                        <View style={styles.adjusterRow}>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxH(Math.max(20, simBboxH - 10))}>
                                <Text style={styles.adjusterBtnText}>-10</Text>
                            </Pressable>
                            <Pressable style={styles.adjusterBtn} onPress={() => setSimBboxH(Math.min(500, simBboxH + 10))}>
                                <Text style={styles.adjusterBtnText}>+10</Text>
                            </Pressable>
                        </View>

                        <Pressable 
                            style={styles.submitBtn}
                            onPress={handleTriggerAIDetect}
                            disabled={isTriggeringAI}
                        >
                            {isTriggeringAI ? (
                                <ActivityIndicator size="small" color={colors.bgDeep} />
                            ) : (
                                <Text style={styles.submitBtnText}>TRIGGER AI ALERT STATE</Text>
                            )}
                        </Pressable>

                        <Pressable 
                            style={styles.resetBtn}
                            onPress={handleResetAll}
                        >
                            <Text style={styles.resetBtnText}>RESET ALL SIMULATORS</Text>
                        </Pressable>
                    </View>

                    {/* FACE WATCH SERVICE */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>FACE WATCH SERVICE</Text>
                        <View style={styles.switchRow}>
                            <View>
                                <Text style={styles.switchLabel}>AUTO FACE RECOGNITION</Text>
                                <Text style={styles.patrolDesc}>Scan frames every 3s for matching</Text>
                            </View>
                            <Pressable 
                                style={[styles.toggleBtn, faceWatchActive ? styles.toggleBtnOn : styles.toggleBtnOff]}
                                onPress={toggleFaceWatch}
                            >
                                <Text style={styles.toggleBtnText}>{faceWatchActive ? "RUNNING" : "STOPPED"}</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* MQTT HEALTH BADGE */}
                    <View style={styles.settingsCard}>
                        <Text style={styles.settingsTitle}>MQTT BROKER HEALTH</Text>
                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Broker Link Status:</Text>
                            <View style={[styles.badge, mqttConnected ? styles.badgeActive : styles.badgeLocked]}>
                                <Text style={styles.badgeText}>{mqttConnected ? "CONNECTED" : "OFFLINE"}</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* NOTIFICATIONS DROPDOWN MODAL */}
            <Modal
                visible={showNotifications}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowNotifications(false)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setShowNotifications(false)}
                >
                    <View style={styles.notificationsModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>THREAT DETECT LOGS</Text>
                            <Pressable onPress={() => setShowNotifications(false)}>
                                <Text style={styles.closeModalText}>✕</Text>
                            </Pressable>
                        </View>
                        <ScrollView style={styles.notificationsScroll}>
                            {notifications.length === 0 ? (
                                <Text style={styles.emptyNotifications}>
                                    No threat logs recorded. System secure.
                                </Text>
                            ) : (
                                notifications.map((item) => (
                                    <View 
                                        key={item.id} 
                                        style={[
                                            styles.notificationCard, 
                                            item.is_read ? styles.notifRead : styles.notifUnread
                                        ]}
                                    >
                                        <View style={styles.notifTop}>
                                            <Text style={styles.notifTime}>
                                                {item.created_at?.replace('T', ' ').substring(11, 19)}
                                            </Text>
                                            <Text style={styles.notifRisk}>{item.risk_level}</Text>
                                        </View>
                                        <Text style={styles.notifMessage}>{item.message}</Text>
                                        
                                        {!item.is_read && (
                                            <Pressable 
                                                style={styles.notifReadBtn}
                                                onPress={() => markAsRead(item.id)}
                                            >
                                                <Text style={styles.notifReadBtnText}>Mark as Read</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* EVENT DETAIL VIEW SNAPSHOT MODAL */}
            <Modal
                visible={selectedEvent !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedEvent(null)}
            >
                <Pressable 
                    style={styles.modalOverlay}
                    onPress={() => setSelectedEvent(null)}
                >
                    {selectedEvent && (
                        <View style={styles.eventDetailContent} onStartShouldSetResponder={() => true}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    LOG SCOPE SCOURCE [#{selectedEvent.id}]
                                </Text>
                                <Pressable onPress={() => setSelectedEvent(null)}>
                                    <Text style={styles.closeModalText}>✕</Text>
                                </Pressable>
                            </View>

                            {selectedEvent.snapshot_path ? (
                                <Image
                                    source={{ uri: `${api.getBaseUrl()}${selectedEvent.snapshot_path}` }}
                                    style={styles.eventModalImage}
                                    resizeMode="contain"
                                />
                            ) : (
                                <View style={styles.noMediaImagePlaceholder}>
                                    <Text style={styles.noMediaImageText}>NO MEDIA SNAPSHOT FOR THIS THREAT</Text>
                                </View>
                            )}

                            <ScrollView style={styles.eventDetailsTable}>
                                <View style={styles.eventDetailRow}>
                                    <Text style={styles.eventDetailLabel}>TIMESTAMP:</Text>
                                    <Text style={styles.eventDetailVal}>{selectedEvent.created_at?.replace('T', ' ')}</Text>
                                </View>
                                <View style={styles.eventDetailRow}>
                                    <Text style={styles.eventDetailLabel}>TYPE:</Text>
                                    <Text style={styles.eventDetailVal}>{selectedEvent.event_type}</Text>
                                </View>
                                <View style={styles.eventDetailRow}>
                                    <Text style={styles.eventDetailLabel}>SOURCE:</Text>
                                    <Text style={styles.eventDetailVal}>{selectedEvent.source}</Text>
                                </View>
                                <View style={styles.eventDetailRow}>
                                    <Text style={styles.eventDetailLabel}>RISK LEVEL:</Text>
                                    <Text style={[styles.eventDetailVal, styles.riskValText]}>
                                        {selectedEvent.risk_level}
                                    </Text>
                                </View>
                                <View style={styles.eventDetailRow}>
                                    <Text style={styles.eventDetailLabel}>CONFIDENCE:</Text>
                                    <Text style={styles.eventDetailVal}>
                                        {selectedEvent.confidence ? `${(selectedEvent.confidence * 100).toFixed(1)}%` : 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.eventDetailRow}>
                                    <Text style={styles.eventDetailLabel}>MESSAGE:</Text>
                                    <Text style={styles.eventDetailVal}>{selectedEvent.message}</Text>
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </Pressable>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bgDeep,
    },
    navbar: {
        height: 60,
        backgroundColor: colors.bgPanel,
        borderBottomWidth: 1.5,
        borderBottomColor: colors.borderColor,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    logoIcon: {
        fontSize: 22,
        textShadowColor: colors.accentRed,
        textShadowRadius: 6,
    },
    brandTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: colors.textPrimary,
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    brandSubtitle: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.accentCyan,
        fontFamily: 'monospace',
        letterSpacing: 1.5,
        marginTop: 1,
    },
    navbarControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bellButton: {
        position: 'relative',
        padding: 4,
        marginRight: 2,
    },
    bellIcon: {
        fontSize: 18,
    },
    badgeCount: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: colors.accentRed,
        borderRadius: 6,
        width: 13,
        height: 13,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeCountText: {
        color: '#fff',
        fontSize: 7,
        fontWeight: '900',
    },
    sysTelemetryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgDeep,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderColor,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotGreen: {
        backgroundColor: colors.accentGreen,
        shadowColor: colors.accentGreen,
        shadowRadius: 4,
        shadowOpacity: 0.8,
    },
    dotRed: {
        backgroundColor: colors.accentRed,
    },
    statusText: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    btnEmergency: {
        backgroundColor: colors.accentRed,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    btnEmergencyText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.bgPanel,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 4,
    },
    tabItemActive: {
        backgroundColor: colors.accentCyan,
        shadowColor: colors.accentCyan,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    tabText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    tabTextActive: {
        color: '#ffffff',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 12,
        paddingBottom: 40,
    },
    videoStageCard: {
        backgroundColor: '#000',
        borderColor: colors.borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 10,
    },
    videoStageCardAlert: {
        borderColor: colors.accentRed,
        shadowColor: colors.accentRed,
        shadowRadius: 10,
        shadowOpacity: 0.25,
    },
    videoStage: {
        width: '100%',
        aspectRatio: 16 / 9,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#020408',
    },
    liveStreamWrapper: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    streamFeedImage: {
        width: '100%',
        height: '100%',
    },
    hudOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    hudTargetBox: {
        position: 'absolute',
        borderWidth: 2,
        borderRadius: 2,
    },
    hudTargetLabel: {
        position: 'absolute',
        top: -18,
        left: -2,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hudAlertDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#fff',
    },
    hudTargetText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '950',
        fontFamily: 'monospace',
    },
    bracket: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderColor: colors.accentCyan,
    },
    bracketTL: {
        top: 10,
        left: 10,
        borderTopWidth: 2,
        borderLeftWidth: 2,
    },
    bracketTR: {
        top: 10,
        right: 10,
        borderTopWidth: 2,
        borderRightWidth: 2,
    },
    bracketBL: {
        bottom: 10,
        left: 10,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
    },
    bracketBR: {
        bottom: 10,
        right: 10,
        borderBottomWidth: 2,
        borderRightWidth: 2,
    },
    hudTelemetryHeader: {
        position: 'absolute',
        top: 10,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    hudTelemetryFooter: {
        position: 'absolute',
        bottom: 10,
        left: 30,
        right: 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    hudTelemetryText: {
        color: 'rgba(255, 94, 54, 0.6)',
        fontSize: 7,
        fontFamily: 'monospace',
    },
    hudTelemetryAlertText: {
        color: colors.accentRed,
    },
    scannerLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1.5,
        backgroundColor: colors.accentCyan,
        opacity: 0.4,
    },
    scannerLineDanger: {
        backgroundColor: colors.accentRed,
    },
    crosshair: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 30,
        height: 30,
        marginTop: -15,
        marginLeft: -15,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.3,
    },
    crosshairCircle: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderColor: colors.accentCyan,
        borderRadius: 5,
    },
    crosshairH: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: colors.accentCyan,
    },
    crosshairV: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: colors.accentCyan,
    },
    offlineFeed: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineDotPulse: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.accentRed,
        marginBottom: 8,
    },
    offlineText: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textSecondary,
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    offlineTelemetryText: {
        fontSize: 7,
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginTop: 4,
    },
    cameraRoster: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10,
    },
    cameraThumbnailCard: {
        flex: 1,
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraThumbnailActive: {
        borderColor: colors.accentCyan,
        backgroundColor: 'rgba(255, 94, 54, 0.05)',
    },
    cameraThumbLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    cameraThumbLabelActive: {
        color: colors.accentCyan,
    },
    cameraThumbName: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
        textAlign: 'center',
    },
    patrolCard: {
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 6,
        padding: 12,
        marginVertical: 4,
    },
    patrolTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.accentCyan,
        fontFamily: 'monospace',
        letterSpacing: 1,
        marginBottom: 6,
    },
    patrolRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    patrolDesc: {
        fontSize: 9,
        color: colors.textSecondary,
        flex: 1,
        marginRight: 10,
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleBtnOn: {
        borderColor: colors.accentCyan,
        backgroundColor: 'rgba(255, 94, 54, 0.08)',
    },
    toggleBtnOff: {
        borderColor: colors.borderColor,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    toggleBtnText: {
        fontSize: 8,
        fontWeight: '900',
        fontFamily: 'monospace',
        color: colors.textPrimary,
    },
    zonesMonitorCard: {
        marginVertical: 10,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textSecondary,
        fontFamily: 'monospace',
        letterSpacing: 1,
        marginBottom: 10,
    },
    zoneCard: {
        borderRadius: 6,
        borderWidth: 1.5,
        padding: 12,
        marginBottom: 10,
        position: 'relative',
    },
    zoneCardNormal: {
        borderColor: colors.borderColor,
        backgroundColor: colors.bgPanel,
        borderLeftWidth: 4,
        borderLeftColor: colors.accentCyan,
    },
    zoneCardAlert: {
        borderColor: colors.accentRed,
        backgroundColor: 'rgba(255, 59, 48, 0.05)',
        borderLeftWidth: 4,
        borderLeftColor: colors.accentRed,
    },
    zoneHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    zoneName: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textPrimary,
    },
    zoneDesc: {
        fontSize: 8,
        color: colors.textMuted,
        marginTop: 2,
    },
    zoneBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
    },
    zoneBadgeSafe: {
        borderColor: 'rgba(255, 94, 54, 0.2)',
        backgroundColor: 'rgba(255, 94, 54, 0.05)',
    },
    zoneBadgeAlert: {
        borderColor: colors.accentRed,
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
    },
    zoneBadgeText: {
        fontSize: 7,
        fontWeight: '900',
        fontFamily: 'monospace',
        color: colors.textPrimary,
    },
    zoneTelemetryRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    zoneTelemetryPill: {
        flex: 1,
        backgroundColor: colors.bgDeep,
        padding: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.borderColor,
    },
    zonePillLabel: {
        fontSize: 7,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    zonePillValue: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textPrimary,
        fontFamily: 'monospace',
        marginTop: 2,
    },
    btnSprinkler: {
        backgroundColor: colors.bgCard,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 4,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnSprinklerActive: {
        borderColor: colors.accentRed,
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
    },
    btnSprinklerText: {
        fontSize: 9,
        fontWeight: '900',
        fontFamily: 'monospace',
        color: colors.textPrimary,
    },
    subScreenContainer: {
        flex: 1,
        padding: 12,
    },
    subScreenHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    subScreenTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: colors.accentCyan,
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    refreshBtn: {
        borderWidth: 1,
        borderColor: colors.accentCyan,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 94, 54, 0.05)',
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshBtnText: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.accentCyan,
        fontFamily: 'monospace',
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 10,
        color: colors.textSecondary,
        fontFamily: 'monospace',
        marginTop: 12,
    },
    logsList: {
        flex: 1,
    },
    logCard: {
        backgroundColor: colors.bgPanel,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
    },
    logCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    logId: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    logTime: {
        fontSize: 10,
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    logRiskBadge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 2,
        borderWidth: 0.5,
    },
    logRiskAlert: {
        borderColor: colors.accentRed,
        backgroundColor: 'rgba(255,59,48,0.1)',
    },
    logRiskSafe: {
        borderColor: colors.borderColor,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    logRiskText: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.textPrimary,
        fontFamily: 'monospace',
    },
    logMessage: {
        fontSize: 11,
        color: colors.textPrimary,
        marginVertical: 4,
    },
    logCardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    logMeta: {
        fontSize: 8,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    viewFrameText: {
        fontSize: 8,
        color: colors.accentCyan,
        fontWeight: '900',
        fontFamily: 'monospace',
        textDecorationLine: 'underline',
    },
    noMediaText: {
        fontSize: 8,
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    emptyLogsText: {
        fontSize: 10,
        color: colors.textMuted,
        textAlign: 'center',
        paddingVertical: 30,
        fontStyle: 'italic',
    },
    settingsCard: {
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
    },
    settingsTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.accentCyan,
        fontFamily: 'monospace',
        letterSpacing: 1,
        marginBottom: 4,
    },
    settingsDesc: {
        fontSize: 8,
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginBottom: 10,
    },
    ipConfigRow: {
        flexDirection: 'row',
        gap: 8,
    },
    ipInput: {
        flex: 1,
        backgroundColor: colors.bgDeep,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        color: colors.textPrimary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 12,
        fontFamily: 'monospace',
    },
    ipSaveBtn: {
        backgroundColor: colors.accentCyan,
        borderRadius: 4,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    ipSaveBtnText: {
        color: colors.bgDeep,
        fontSize: 10,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    fieldLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.textSecondary,
        fontFamily: 'monospace',
        marginTop: 10,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    subFieldLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textMuted,
        fontFamily: 'monospace',
        marginTop: 6,
        marginBottom: 2,
    },
    textField: {
        backgroundColor: colors.bgDeep,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        color: colors.textPrimary,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 11,
        fontFamily: 'monospace',
    },
    adjusterRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 4,
    },
    adjusterBtn: {
        flex: 1,
        backgroundColor: colors.bgCard,
        borderColor: colors.borderColor,
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adjusterBtnText: {
        color: colors.accentCyan,
        fontSize: 9,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 6,
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.03)',
    },
    switchLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textPrimary,
        fontFamily: 'monospace',
    },
    submitBtn: {
        backgroundColor: colors.accentCyan,
        borderRadius: 4,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    submitBtnText: {
        color: colors.bgDeep,
        fontSize: 10,
        fontWeight: '900',
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    resetBtn: {
        borderColor: colors.accentRed,
        borderWidth: 1,
        backgroundColor: 'rgba(255,59,48,0.05)',
        borderRadius: 4,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    resetBtnText: {
        color: colors.accentRed,
        fontSize: 9,
        fontWeight: '900',
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    notificationsModalContent: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor,
        paddingBottom: 10,
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.accentCyan,
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    closeModalText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: 'bold',
        padding: 4,
    },
    notificationsScroll: {
        flexGrow: 0,
    },
    emptyNotifications: {
        color: colors.textMuted,
        fontSize: 10,
        textAlign: 'center',
        paddingVertical: 20,
        fontStyle: 'italic',
    },
    notificationCard: {
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderRadius: 4,
        padding: 10,
        marginBottom: 8,
        position: 'relative',
    },
    notifRead: {
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        opacity: 0.6,
    },
    notifUnread: {
        backgroundColor: 'rgba(255, 94, 54, 0.04)',
        borderColor: colors.accentCyan,
    },
    notifTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    notifTime: {
        fontSize: 9,
        color: colors.textSecondary,
        fontFamily: 'monospace',
    },
    notifRisk: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.accentRed,
        fontFamily: 'monospace',
    },
    notifMessage: {
        fontSize: 10,
        color: colors.textPrimary,
    },
    notifReadBtn: {
        alignSelf: 'flex-end',
        marginTop: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 2,
        backgroundColor: colors.accentCyan,
    },
    notifReadBtnText: {
        color: colors.bgDeep,
        fontSize: 8,
        fontWeight: '900',
    },
    eventDetailContent: {
        width: '95%',
        maxHeight: '90%',
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 16,
    },
    eventModalImage: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: '#000',
        borderRadius: 4,
        marginBottom: 12,
    },
    noMediaImagePlaceholder: {
        width: '100%',
        aspectRatio: 16 / 10,
        backgroundColor: '#020408',
        borderRadius: 4,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderColor,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    noMediaImageText: {
        color: colors.textMuted,
        fontFamily: 'monospace',
        fontSize: 9,
        textAlign: 'center',
    },
    eventDetailsTable: {
        flexGrow: 0,
    },
    eventDetailRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 8,
    },
    eventDetailLabel: {
        width: 100,
        fontSize: 9,
        fontWeight: '900',
        color: colors.textMuted,
        fontFamily: 'monospace',
    },
    eventDetailVal: {
        flex: 1,
        fontSize: 10,
        color: colors.textPrimary,
    },
    riskValText: {
        color: colors.accentRed,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    logoImage: {
        width: 28,
        height: 28,
        resizeMode: 'contain',
        marginRight: 4,
    },
    systemStatsBanner: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: colors.bgPanel,
        borderColor: colors.borderColor,
        borderWidth: 1.5,
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 8,
        marginBottom: 12,
        shadowColor: colors.accentCyan,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statBannerItem: {
        flex: 1,
        alignItems: 'center',
    },
    statBannerLabel: {
        fontSize: 7,
        fontWeight: '800',
        color: colors.textMuted,
        fontFamily: 'monospace',
        letterSpacing: 0.5,
    },
    statBannerValue: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textPrimary,
        fontFamily: 'monospace',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: colors.borderColor,
    },
});
