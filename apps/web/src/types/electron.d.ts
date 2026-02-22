export { };

declare global {
    interface Window {
        electron?: {
            platform: NodeJS.Platform;
            versions: NodeJS.ProcessVersions;
            getAppVersion: () => Promise<string>;
            checkForUpdates: () => Promise<boolean>;
        };
    }
}
