package com.MTA.V01.controllers;

import com.MTA.V01.payload.requests.AddUserToFamilyRequest;
import com.MTA.V01.services.controllers.UserServices;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = {"https://meditracker.fit","http://meditracker.fit", "smrtnmedi.netlify.app","https://www.meditracker.fit","http://meditracker.fit"}, maxAge = 3600)
@RequestMapping("/api/family")
public class FamilyController {
    @Autowired
    UserServices userServices;

    @PostMapping("/add")
    public ResponseEntity<?> addUserToFamily(@Valid @RequestBody AddUserToFamilyRequest addUserToFamilyRequest){
        return userServices.addUserToFamily(addUserToFamilyRequest.getUsername(),addUserToFamilyRequest.getFamilyCode(),addUserToFamilyRequest.getRelationship());
    }

    @GetMapping("/getfamilycode")
    public ResponseEntity<?> getFamilyCode(){
        return userServices.getFamilyCode();
    }

    @GetMapping("/refreshfamilycode")
    public ResponseEntity<?> refreshFamilyCode(){
        return userServices.refreshFamilyCode();
    }

    @GetMapping("/add/doctor/{username}/{doctorcode}")
    public ResponseEntity<?> addDoctor(@PathVariable("username") String username,@PathVariable("doctorcode") String doctorCode){
        return userServices.addUserToDoctors(username,doctorCode);
    }

    @GetMapping("/getpatientcode")
    public ResponseEntity<?> getPatientCode(){
        return userServices.getPatientCode();
    }

    @GetMapping("refreshpatientcode")
    public ResponseEntity<?> refreshPatientCode(){
        return userServices.refreshPatientCode();
    }

    @DeleteMapping("/remove/{username}")
    public ResponseEntity<?> removeUserFromFamily(@PathVariable("username") String username){
        return userServices.removeUserFromFamily(username);
    }

    @GetMapping("/checkfamilydose/{username}")
    public ResponseEntity<?> checkFamilyDoses(@PathVariable("username") String username){
        return userServices.checkFamilyDoses(username);
    }

    @GetMapping("/checkpastdose/{username}")
    public ResponseEntity<?> checkFamilyPastDoses(@PathVariable("username") String username){
        return userServices.checkFamilyPastDoses(username);
    }

    @GetMapping("/checkfamily")
    public ResponseEntity<?> checkFamily(){
        return userServices.checkFamily();
    }

    @GetMapping("/checkdoctors")
    public ResponseEntity<?> checkDoctors(){
        return userServices.checkDoctors();
    }

}
