'use client';

import * as React from 'react';
import { PlugZap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import IntegrationForBrowserExtension from './IntegrationForBrowserExtension';
import IntegrationForSpotify from './IntegrationForSpotify';

export default function IntegrationsCard() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3 pb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <PlugZap className="h-8 w-8 text-primary stroke-2" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-xl font-black">
                            Integrations
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Connect services to auto-track your learning activity
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <IntegrationForBrowserExtension />
                <IntegrationForSpotify />
            </CardContent>
        </Card>
    );
}


