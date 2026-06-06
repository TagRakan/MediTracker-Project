package com.MTA.V01.controllers.admin;

import com.MTA.V01.services.controllers.LogServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/admin/log")
public class LogController {
    @Autowired
    LogServices logServices;

    @GetMapping("/all")
    public ResponseEntity<?> getAll(){
        return ResponseEntity.ok(logServices.findAllLogs());
    }

    @GetMapping("/search/{term}")
    public ResponseEntity<?> searchByKeyword(@PathVariable("term") String searchTerm){
        return ResponseEntity.ok(logServices.searchLogKeyword(searchTerm));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<?> findByType(@PathVariable("type") String logtype){
        return ResponseEntity.ok(logServices.findByLogType(logtype));
    }
}
