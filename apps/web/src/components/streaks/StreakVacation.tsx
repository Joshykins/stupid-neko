import { Palmtree } from "lucide-react";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card } from "../ui/card";

export const StreakVacation = () => {
    return (
        <Card className="p-2">
            <div className="flex gap-2 items-center">
                <p>
                    Streak Vacation
                </p>
                <Progress className="flex-1 bg-sky-200" value={70} />
                <Button className="bg-sky-200 filter-black overflow-hidden rounded-full relative" size="icon">
                    <Palmtree className="!size-6 fill-green-400 stroke-green-700" />
                    <div className="absolute bg-yellow-100 absolute left-0 right-0 bottom-0 h-2" />
                </Button>
            </div>
        </Card>
    );
};