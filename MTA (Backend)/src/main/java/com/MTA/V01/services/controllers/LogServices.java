package com.MTA.V01.services.controllers;

import com.MTA.V01.models.Log;
import com.MTA.V01.models.enumerationClasses.LogType;
import com.MTA.V01.models.enumerations.ELogType;
import com.MTA.V01.repositories.LogRepository;
import com.MTA.V01.repositories.enumRepos.LogTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LogServices {
    @Autowired
    LogRepository logRepository;
    @Autowired
    LogTypeRepository logTypeRepository;

    public void addLog(String description){
        LogType logType = new LogType();
        logType.setName(ELogType.ADD);
        Log log = new Log(logType,description);
        log.setLocalDateTime(LocalDateTime.now());
        System.out.println(log);
        logRepository.save(log);
    }
    public void deleteLog(String description){
        LogType logType = new LogType();
        logType.setName(ELogType.DELETE);
        Log log = new Log(logType,description);
        log.setLocalDateTime(LocalDateTime.now());
        System.out.println(log);
        logRepository.save(log);
    }
    public void updateLog(String description){
        LogType logType = new LogType();
        logType.setName(ELogType.UPDATE);
        Log log = new Log(logType,description);
        log.setLocalDateTime(LocalDateTime.now());
        System.out.println(log);
        logRepository.save(log);
    }

    public List<Log> findAllLogs(){
        return logRepository.findAll();
    }
    public List<Log> searchLogKeyword(String keyword){
        return logRepository.findByDescriptionContainsIgnoreCase(keyword);
    }
    public List<Log> findByLogType(String logType){
        return logRepository.findByLogType_Name(ELogType.valueOf(logType));
    }

}
