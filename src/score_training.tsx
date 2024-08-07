import React, { useEffect, useState } from 'react';
import { Stepper, Divider, Button } from 'antd-mobile';
import { Vex, Stave, StaveNote, Formatter } from 'vexflow';
import './score_training.less';

const VexFlow = Vex.Flow;

const DEFAULT_GROUP_RANGE = [2, 6];
const FULL_GROUP_RANGE = [1, 7];
const DEFAULT_SCORE_COUNT = 4;

const STD_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const FULL_GROUPS = [1, 2, 3, 4, 5, 6, 7];

function generateKey(groupRange: [number, number]): string {
    const gr = Math.random() * (groupRange[1] - groupRange[0] + 1);
    const group = groupRange[0] + Math.min(Math.floor(gr), groupRange[1] - groupRange[0]);
    const kr = Math.min(Math.floor(Math.random() * STD_KEYS.length), STD_KEYS.length - 1);
    const key = STD_KEYS[kr];
    return `${key}/${group}`;
}

function generateKeys(groupRange: [number, number], maxCount: number): string[] {
    const count = Math.max(1, Math.ceil(Math.random() * maxCount));
    const keys: string[] = [];
    for (let i = 0; i < count; ++i) {
        keys.push(generateKey(groupRange));
    }
    const sorted = keys.sort((key1, key2) => {
        const [bk1, g1] = key1.split('/');
        const [bk2, g2] = key2.split('/');
        const gDiff = Number(g1) - Number(g2);
        if (gDiff !== 0) return Math.sign(gDiff);
        const index1 = STD_KEYS.indexOf(bk1);
        const index2 = STD_KEYS.indexOf(bk2);
        return Math.sign(index1 - index2);
    });
    return [...new Set(sorted)];
}

export function ScoreTraining() {
    const [lowerGroup, setLowerGroup] = useState(DEFAULT_GROUP_RANGE[0]);
    const [upperGroup, setUpperGroup] = useState(DEFAULT_GROUP_RANGE[1]);
    const [maxScoreCount, setMaxScoreCount] = useState(DEFAULT_SCORE_COUNT);
    const [running, setRunning] = useState(false);
    const [keys, setKeys] = useState<string[]>([]);
    const [costs, setCosts] = useState<number[]>([]);
    const [states, setStates] = useState<boolean[]>([]);
    const [startTime, setStartTime] = useState(-1);
    const [currentCost, setCurrentCost] = useState(0);
    const [askForGroup, setAskForGroup] = useState(false);
    const [currentInput, setCurrentInput] = useState('');
    const [lastAnswer, setLastAnswer] = useState('');

    useEffect(() => {
        let handle = setInterval(() => {
            if (startTime <= 0) return;
            const cost = performance.now() - startTime;
            setCurrentCost(cost);
        }, 500);
        return () => clearInterval(handle);
    }, [startTime]);

    useEffect(() => {
        if (running) {
            setKeys(generateKeys([lowerGroup, upperGroup], maxScoreCount));
            setStartTime(performance.now());
        }
    }, [running, lowerGroup, upperGroup, maxScoreCount]);

    useEffect(() => {
        const region = document.getElementById('score-region') as HTMLDivElement;
        if (!region || keys.length === 0) return;
        const renderer = new VexFlow.Renderer(region, VexFlow.Renderer.Backends.SVG);
        const height = window.innerHeight / 2 - 50;
        renderer.resize(window.innerWidth, height);
        const context = renderer.getContext();
        context.setFont('Arial', 10);

        const stave = new Stave(10, 0, window.innerWidth - 20);
        stave.addClef('treble').addTimeSignature('4/4');
        stave.setContext(context).draw();

        const duration = ['1', '2', '4', '8'][Math.min(Math.floor(Math.random() * 4), 3)];
        const notes = [new StaveNote({ keys, duration })];
        Formatter.FormatAndDraw(context, stave, notes);
        region.querySelector('svg')!.setAttribute('viewBox', `0, -80, ${window.innerWidth} ${height}`);
    }, [keys]);

    const inputAnswer = (segment: string) => {
        const answer = `${currentInput}${segment}`;
        setCurrentInput(answer);
        if (answer.length === keys.length * 2 + (keys.length - 1)) {
            const cost = performance.now() - startTime;
            // 输入完成了
            const stdAnswer = keys.join(' ').replace(/\//g, '');
            const state = answer === stdAnswer;
            setCosts([...costs, cost]);
            setStates([...states, state]);
            setLastAnswer(stdAnswer);
        }
    };

    const next = () => {
        // 开始下一个测试
        document.getElementById('score-region').children[0].remove();
        setLastAnswer('');
        setKeys(generateKeys([lowerGroup, upperGroup], maxScoreCount));
        setCurrentInput('');
        setCurrentCost(0);
        setStartTime(performance.now());
    }

    const inputKey = (key: string) => {
        const prefix = (currentInput.length === 0 || currentInput.endsWith(' ')) ? '' : ' ';
        setAskForGroup(true);
        inputAnswer(`${prefix}${key}`);
    };

    const inputGroup = (group: number | string) => {
        setAskForGroup(false);
        inputAnswer(String(group));
    };

    return <div>
        {
            running ? <div>
                <div id="score-region"></div>
                <div className="title-row">
                    状态
                </div>
                <div className="row">
                    <span>正确率：{Math.round(states.filter(st => st).length / states.length * 100)}%</span>
                    <span>平均用时：{Math.round(costs.reduce((c1, c2) => c1 + c2, 0) / costs.length) / 1000}s</span>
                    <span>当前用时：{currentCost > 0 ? `${Math.round(currentCost) / 1000}s` : '-'}</span>
                </div>
                <div className="title-row">
                    键盘
                </div>
                <div className="row">
                    <span>当前输入：</span>
                    <span>{currentInput}</span>
                </div>
                <div className="row" style={{ opacity: (askForGroup || lastAnswer) ? 0.5 : 1, pointerEvents: (askForGroup || lastAnswer) ? 'none' : 'initial' }}>
                    {STD_KEYS.map(key => (<Button size="large" key={key} onClick={() => inputKey(key)}>{key}</Button>))}
                </div>
                <div className="row" style={{ opacity: (askForGroup && !lastAnswer) ? 1 : 0.5, pointerEvents: (askForGroup && !lastAnswer) ? 'initial' : 'none' }}>
                    {FULL_GROUPS.map(group => (<Button size="large" key={group} onClick={() => inputGroup(group)}>{group}</Button>))}
                </div>
                {lastAnswer ? <div>
                    <div className="title-row">
                        结果
                    </div>
                    <div className="row">
                        <span style={{ color: states[states.length - 1] ? '#5b8c00' : '#f5222d'}}>回答{states[states.length - 1] ? '正确' : '错误'}</span>
                        <span>正确答案：{lastAnswer}</span>
                        <span>耗时：{Math.round(costs[costs.length - 1]) / 1000}s</span>
                    </div>
                    <Button onClick={next}>下一题</Button>
                </div> : null}
            </div> : <div>
                <div className="title-row">
                    训练设置
                </div>
                <div className="row">
                    <span>音域：</span>
                    <Stepper value={lowerGroup} onChange={setLowerGroup} min={FULL_GROUP_RANGE[0]} max={upperGroup} />
                    <span>-</span>
                    <Stepper value={upperGroup} onChange={setUpperGroup} min={lowerGroup} max={FULL_GROUP_RANGE[1]} />
                </div>
                <div className="row">
                    <span>最大音符数：</span>
                    <Stepper value={maxScoreCount} onChange={setMaxScoreCount} min={1} />
                </div>
                <Divider />
                <div className="row">
                    <Button color="primary" onClick={() => setRunning(true)}>Run</Button>
                </div>
            </div>
        }
    </div>;
}
